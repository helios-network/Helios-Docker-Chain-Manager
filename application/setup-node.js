const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const { fileGetContent } = require('../utils/file-get-content');
const path = require('path');
const os = require('os');
const { keyStoreRecover } = require('../utils/key-store');
const { ethers } = require('ethers');

const setupNode = async (app, keyStoreNode, walletPassword, moniker, chainId, genesisURL, peerInfos) => {
    
    const jsonKeyStoreNode = JSON.parse(keyStoreNode);
    const privateKey = await keyStoreRecover(keyStoreNode, walletPassword);
    
    const homeDirectory = await app.actions.getHomeDirectory.use();

    fs.writeFileSync(path.join(homeDirectory, 'id'), jsonKeyStoreNode.address);
    fs.writeFileSync(path.join(homeDirectory, 'keystore'), keyStoreNode);
    fs.writeFileSync(path.join(homeDirectory, 'moniker'), moniker);
    fs.writeFileSync(path.join(homeDirectory, 'chainId'), `${chainId}`);

    let genesisContent = undefined;
    if (genesisURL != undefined) {
        genesisContent = (await fileGetContent(genesisURL)).toString();
    }
    const removeBlockChainResult = await execWrapper(`rm -rf ${path.join(homeDirectory, 'config')}`);
    await execWrapper(`rm -rf ${path.join(homeDirectory, 'keyring-local')}`);
    await execWrapper(`rm -rf ${path.join(homeDirectory, 'data')}`);
    const initResult = await execWrapper(`heliades init ${moniker} --chain-id ${chainId}`);
    const resultKeyAdd = await execWrapper(`heliades keys add user0 --from-private-key="${privateKey}" --keyring-backend="local"`);

    if (!resultKeyAdd.includes("name: user0")) {
        console.log(resultKeyAdd);
        return false;
    }

    let appTomlPath = path.join(homeDirectory, 'config/app.toml');
    let appToml = fs.readFileSync(appTomlPath).toString();
    fs.writeFileSync(appTomlPath, appToml.replace("tcp://localhost:1317", "tcp://0.0.0.0:1317"));

    if (genesisContent != undefined && genesisContent != '') { // sync to peer
        const destGenesisPath = path.join(homeDirectory, 'config/genesis.json');
        fs.writeFileSync(destGenesisPath, genesisContent);

        let configTomlPath = path.join(homeDirectory, 'config/config.toml');
        let configToml = fs.readFileSync(configTomlPath).toString();

        const peerNode = `${peerInfos.nodeId}@${peerInfos.nodeIP}:${peerInfos.nodeP2PPort}`;
        fs.writeFileSync(configTomlPath, configToml.replace(/persistent_peers \= \"\"/gm, `persistent_peers = "${peerNode}"`))
    } else {
        // TEST rollback
        const genesisPath = path.join(homeDirectory, 'config/genesis.json');
        let genesisJson = JSON.parse(fs.readFileSync(genesisPath).toString());

        genesisJson.app_state.gov.params.voting_period = "30m";
        genesisJson.app_state.gov.params.expedited_voting_period = "5m";
        genesisJson.app_state.staking.params.unbonding_time = "30s";

        genesisJson.app_state.staking.params.epoch_length = "100"; // Set epoch_length to 100
        genesisJson.app_state.staking.params.validators_per_epoch = "100"; // Set validators_per_epoch to 100
        genesisJson.app_state.staking.params.epoch_enabled = true; // Enable epoch-based validator rotation

        genesisJson.app_state.staking.params.stake_weight_factor = "85"; // Enable epoch-based validator rotation
        genesisJson.app_state.staking.params.baseline_chance_factor = "5";
        genesisJson.app_state.staking.params.randomness_factor = "10";
        genesisJson.app_state.staking.params.treasury_address = "helios1j04zcmel9ecmfnnd9yue6y6vhfwyzqxgvhraxm";

        genesisJson.app_state.distribution.params.community_tax = "0.02";

        // New parameters for delegator stake reduction
        genesisJson.app_state.staking.params.delegator_stake_reduction = {
            enabled: true,
            dominance_threshold: "0.05",
            max_reduction: "0.90",
            curve_steepness: "10.0"
        };

        genesisJson.consensus.params.block.max_gas = "500000000" // (500000000 == 1000 normal tx)
        
        fs.writeFileSync(genesisPath, JSON.stringify(genesisJson, null, 2));
        /////////////////////////

        const genesisSupply = ethers.parseEther("500000000").toString();

        console.log(genesisSupply);

        let address = await execWrapper(`heliades keys show user0 -a --keyring-backend="local"`)
        await execWrapper(`heliades add-genesis-account --chain-id ${chainId} ${address.trim()} ${genesisSupply}ahelios --keyring-backend="local"`);
        
        // REMOVE WHEN TESTNET
        await execWrapper(`heliades add-genesis-account --chain-id ${chainId} ${genesisJson.app_state.staking.params.treasury_address} 100ahelios --keyring-backend="local"`);
        
        await execWrapper(`heliades gentx user0 1000000000000000000ahelios --chain-id ${chainId} --keyring-backend="local" --gas-prices "1000000000ahelios"`);
        await execWrapper(`heliades collect-gentxs`);
        await execWrapper(`heliades validate-genesis`);
    }
    return true;
}

module.exports = {
    setupNode
};