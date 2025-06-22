const { generateJsonKeyStore } = require("../application/generate-json-keystore");
const { getExternalNodeGenesisAndStatus } = require("../application/get-external-node-genesis-and-status");
const { runMinerNode } = require("../application/run-miner-node");
const { setupNode } = require("../application/setup-node");

const action = async (app, environement, action) => {

    const isRequired = ['walletPassword', 'walletPrivateKey', 'peerIp', 'moniker', 'chainId'].reduce((acc, key) => {
        if (action[key] == undefined) {
            console.log(`${key} is required`);
            return false;
        }
        return acc;
    }, true);

    if (!isRequired) {
        return false;
    }

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

    const nodeSetup = await setupNode(app, keyStoreNode, action.walletPassword, action.moniker, action.chainId, genesisAndStatus.genesisURL, peerInfos, action.mode);

    if (nodeSetup) {
        await runMinerNode(app, environement);
    }

    return true;
}

module.exports = {
    action
}