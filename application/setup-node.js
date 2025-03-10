const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const { fileGetContent } = require('../utils/file-get-content');
const path = require('path');
const os = require('os');
const { keyStoreRecover } = require('../utils/key-store');

const setupNode = async (keyStoreNode, walletPassword, moniker, chainId, genesisURL, peerInfos) => {
    
    const jsonKeyStoreNode = JSON.parse(keyStoreNode);
    const privateKey = await keyStoreRecover(keyStoreNode, walletPassword);
    
    if (!fs.existsSync('./node')) {
        fs.mkdirSync('./node');
    }
    fs.writeFileSync(`./node/id`, jsonKeyStoreNode.address);
    fs.writeFileSync(`./node/keystore`, keyStoreNode);
    fs.writeFileSync(`./node/moniker`, moniker);
    fs.writeFileSync('./node/chainId', `${chainId}`);

    let genesisContent = undefined;
    if (genesisURL != undefined) {
        genesisContent = (await fileGetContent(genesisURL)).toString();
    }
    if (genesisContent != undefined && genesisContent != '') {
        fs.writeFileSync('./node/genesis.json', genesisContent.toString());
    }

    const homedir = os.homedir();
    const removeBlockChainResult = await execWrapper(`rm -rf ${path.join(homedir, '.heliades')}`);
    const initResult = await execWrapper(`heliades init ${moniker} --chain-id ${chainId}`);
    const resultKeyAdd = await execWrapper(`heliades keys add user0 --from-private-key="${privateKey}" --keyring-backend="local"`);

    if (!resultKeyAdd.includes("name: user0")) {
        console.log(resultKeyAdd);
        return false;
    }

    if (genesisContent != undefined && genesisContent != '') { // sync to peer
        const destGenesisPath = path.join(homedir, '.heliades/config/genesis.json');
        fs.writeFileSync(destGenesisPath, genesisContent);

        let configTomlPath = path.join(homedir, '.heliades/config/config.toml');
        let configToml = fs.readFileSync(configTomlPath).toString();

        const peerNode = `${peerInfos.nodeId}@${peerInfos.nodeIP}:${peerInfos.nodeP2PPort}`;
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

module.exports = {
    setupNode
};