const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const keyth = require('keythereum');
const { fileGetContent } = require('../utils/file-get-content');
const path = require('path');
const os = require('os');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const decrypt2 = async (json, password) => {
    const keyobj = JSON.parse(json);
    const privateKey = keyth.recover(password,keyobj);
    console.log(privateKey.toString('hex'));
    return privateKey.toString('hex');
}

const install = async (keyStoreNode, passwordCrypted, moniker, chainId, fromGenesisType, genesisContent, nodeInfos) => {

    const jsonKeyStoreNode = JSON.parse(keyStoreNode);

    fs.writeFileSync(`./node/id`, jsonKeyStoreNode.address);
    fs.writeFileSync(`./node/keystore`, keyStoreNode);
    fs.writeFileSync(`./node/moniker`, moniker);

    const homedir = os.homedir();

    const removeBlockChainResult = await execWrapper(`rm -rf ${path.join(homedir, '.heliades')}`);

    const initResult = await execWrapper(`heliades init ${moniker} --chain-id ${chainId}`);

    const resultKeyAdd = await execWrapper(`heliades keys add user0 --from-private-key="${await decrypt2(keyStoreNode, unrot13(atob(passwordCrypted)))}" --keyring-backend="local"`);

    if (!resultKeyAdd.includes("name: user0")) {
        console.log(resultKeyAdd);
        return false;
    }

    if (fromGenesisType === 'existingGenesis') {
        const destGenesisPath = path.join(homedir, '.heliades/config/genesis.json');
        fs.writeFileSync(destGenesisPath, genesisContent);

        // nodeInfos
        let configTomlPath = path.join(homedir, '.heliades/config/config.toml');
        let configToml = fs.readFileSync(configTomlPath).toString();

        const peerNode = `${nodeInfos.nodeId}@${nodeInfos.nodeIP}:${nodeInfos.nodeP2PPort}`;
        fs.writeFileSync(configTomlPath, configToml.replace(/persistent_peers \= \"\"/gm, `persistent_peers = "${peerNode}"`))
    } else {
        let address = await execWrapper(`heliades keys show user0 -a --keyring-backend="local"`)
        await execWrapper(`heliades add-genesis-account --chain-id ${chainId} ${address.trim()} 1000000000000000000000000ahelios --keyring-backend="local"`);
        await execWrapper(`heliades gentx user0 1000000000000000000000ahelios --chain-id ${chainId} --keyring-backend="local" --gas-prices "1000000000ahelios"`);
        await execWrapper(`heliades collect-gentxs`);
        await execWrapper(`heliades validate-genesis`);
    }
    return true;
}

const setupNode = (app, environement) => {
    app.post('/setup-node', async (req, res) => {
        try {
            const keyStoreNode = req.body['keyStoreNode'];
            const passwordCrypted = req.body['password'];
            const fromGenesisType = req.body['fromGenesisType'];
            const genesisURL = req.body['genesisURL'];
            const moniker = req.body['moniker'];
            const chainId = req.body['chainId'];
            const nodeIP = req.body['nodeIP'];
            const nodeId = req.body['nodeId'];
            const nodeGRPCPort = req.body['nodeGRPCPort'];
            const nodeRPCPort = req.body['nodeRPCPort'];
            const nodeP2PPort = req.body['nodeP2PPort'];

            if (!fs.existsSync('./node')) {
                fs.mkdirSync('./node');
            }

            fs.writeFileSync('./node/moniker', moniker);
            fs.writeFileSync('./node/chainId', chainId);

            let genesisContent = '';
            if (fromGenesisType === 'existingGenesis') {
                genesisContent = await fileGetContent(genesisURL);
                fs.writeFileSync('./node/genesis.json', genesisContent.toString());
            } else if (fromGenesisType === 'newGenesis') {
                genesisContent = '';
            } else {
                res.send({ status: 'ko' });
                return ;
            }

            await install(keyStoreNode, passwordCrypted, moniker, chainId, fromGenesisType, genesisContent, {
                nodeIP: nodeIP,
                nodeId: nodeId,
                nodeGRPCPort: nodeGRPCPort,
                nodeRPCPort: nodeRPCPort,
                nodeP2PPort: nodeP2PPort
            });

            app.node.setup = true;

            res.send({ status: 'ready' });

        } catch (e) {
            res.send({ status: 'ko' });
            console.log(e);
        }
    });
};

module.exports = {
    setupNode
};