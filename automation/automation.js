const { generateJsonKeyStore } = require("../application/generate-json-keystore");
const fs = require('fs');
const { setupNode } = require("../application/setup-node");
const { runMinerNode } = require("../application/run-miner-node");
const ethers = require('ethers');
const { getExternalNodeGenesisAndStatus } = require("../application/get-external-node-genesis-and-status");
const { createValidator } = require("../application/createValidator");
const { delegate } = require("../application/delegate");
const { transferToken } = require("../application/transferToken");
const { createToken } = require("../application/createToken");

const actionSetup = async (app, environement, action) => {
    environement.walletPassword = action.walletPassword;
    environement.walletPrivateKey = action.walletPrivateKey;
    const keyStoreNode = await generateJsonKeyStore(action.walletPrivateKey, action.walletPassword);
    const nodeSetup = await setupNode(keyStoreNode, action.walletPassword, action.moniker, action.chainId, action.genesisURL, action.peerInfos);

    if (nodeSetup) {
        await runMinerNode(app, environement);
    }
}

const actionSetupToPeer = async (app, environement, action) => {
    environement.walletPassword = action.walletPassword;
    environement.walletPrivateKey = action.walletPrivateKey;
    const keyStoreNode = await generateJsonKeyStore(action.walletPrivateKey, action.walletPassword);
    const peerIp = action.peerIp;
    const peerGRPCPort = 26657;
    const peerP2PPort = 26656;
    const genesisAndStatus = await getExternalNodeGenesisAndStatus(peerIp, peerGRPCPort);

    if (genesisAndStatus == undefined) {
        console.log('Load genesisAndStatus failed');
        return ;
    }

    const peerInfos = {
        nodeP2PPort: peerP2PPort,
        nodeId: genesisAndStatus.status.node_info.id,
        nodeIP: peerIp
    };

    const nodeSetup = await setupNode(keyStoreNode, action.walletPassword, action.moniker, action.chainId, genesisAndStatus.genesisURL, peerInfos);

    if (nodeSetup) {
        await runMinerNode(app, environement);
    }
}

const actionCreateValidator = async (app, environement, action) => {
    const success = await createValidator(environement.walletPassword, {
        commission: {
            rate: "0.10",
            maxRate: "0.20",
            maxChangeRate: "0.01"
        },
        minSelfDelegation: "1",
        value: "1",
    });
}

const actionDelegate = async (app, environement, action) => {
    const success = await delegate(environement.walletPassword);
}

const actionMultiTransfer = async (app, environement, action) => {
    try {
        const recipientAddresses = action.to;
        const amountInEther = action.value;

        for (let recipientAddress of recipientAddresses) {
            await actionTransfer(app, environement, {
                to: recipientAddress,
                value: amountInEther
            });
        }
        
    } catch (error) {
        console.error('Error sending Multi transaction:', error);
    }
}

const actionTransferToken = async (app, environement, action) => {
    const success = await transferToken(environement.walletPassword, action.tokenAddress, action.to, action.value);
}

const actionCreateToken = async (app, environement, action) => {
    const success = await createToken(environement.walletPassword);
}

const actionCreateTokenAndMultiTransfer = async (app, environement, action) => {
    const success = await createToken(environement.walletPassword);

    const response = await fetch(`http://localhost:8545`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "id": 1,
          "jsonrpc": "2.0",
          "method": "eth_getTokensByPageAndSize",
          "params": [
            "0x1",
            "0x100"
          ]
        }),
      })
    const data = await response.json();
    const token = data.result.find(x => x.metadata.base == 'uBTC');
    const tokenAddress = token.metadata.contract_address;

    try {
        const recipientAddresses = action.to;
        const amountInEther = action.value;

        for (let recipientAddress of recipientAddresses) {
            await transferToken(environement.walletPassword, tokenAddress, recipientAddress, amountInEther);
        }
        
    } catch (error) {
        console.error('Error sending Multi transaction:', error);
    }
}

const actionTransfer = async (app, environement, action) => {
    try {
        const recipientAddress = action.to;
        const amountInEther = action.value;

        const RPC_URL = 'http://localhost:8545';
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(environement.walletPrivateKey, provider);

        // Convertir le montant en wei
        const amountInWei = ethers.parseEther(amountInEther);

        // Créer la transaction
        const tx = {
            to: recipientAddress,
            value: amountInWei,
        };
        // Envoyer la transaction
        const transactionResponse = await wallet.sendTransaction(tx);
        console.log('Transaction sent:', transactionResponse.hash);

        transactionResponse.wait().then((receipt) => {
            console.log('Transaction mined in block:', receipt.blockNumber);
        });
    } catch (error) {
        console.error('Error sending transaction:', error);
    }
}

const doAction = async (app, environement, action) => {
    switch (action.type) {
        case "setup":
            await actionSetup(app, environement, action);
            break ;
        case "setupToPeer":
            await actionSetupToPeer(app, environement, action);
            break ;
        case "transfer":
            await actionTransfer(app, environement, action);
            break ;
        case "multiTransfer":
            await actionMultiTransfer(app, environement, action);
            break ;
        case "multiTransferToken":
            await actionCreateTokenAndMultiTransfer(app, environement, action);
            break ;
        case "createValidator":
            await actionCreateValidator(app, environement, action);
            break ;
        case "delegate":
            await actionDelegate(app, environement, action);
            break ;
        case "wait": // nothing
            break ;
        default:
            console.log(`action ${action.type} not managed`)
            break;
    }
}

module.exports = {
    runAutomation: async (app, environement) => {

        if (fs.existsSync("./.automation-done")) {
            console.log('[Helios Node - API] - RUN Automation Already done');
            return ;
        }
        
        console.log('[Helios Node - API] - RUN Automation');

        // setup app password
        if (environement.env.PASSWORD != undefined && !fs.existsSync('./.password')) {
            environement.password = environement.env.PASSWORD;
            fs.writeFileSync('./.password', environement.password);
        }

        // have actions
        if (environement.env.MANAGER_ACTIONS == undefined) {
            return ;
        }

        // find actions
        const actions = JSON.parse(environement.env.MANAGER_ACTIONS);
        for (let action of actions) {
            if (action.timeout != undefined) {
                await new Promise((resolve) => {
                    setTimeout(async () => {
                        await doAction(app, environement, action);
                        resolve();
                    }, action.timeout);
                });
            } else {
                await doAction(app, environement, action);
            }
        }

        fs.writeFileSync("./.automation-done", "true");
    }
};