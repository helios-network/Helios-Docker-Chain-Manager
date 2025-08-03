const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const { fileGetContent } = require('../utils/file-get-content');
const path = require('path');
const os = require('os');
const { keyStoreRecover } = require('../utils/key-store');
const { ethers } = require('ethers');

const setupNode = async (app, keyStoreNode, walletPassword, moniker, chainId, genesisURL, peerInfos, mode = "archive") => {
    
    const jsonKeyStoreNode = JSON.parse(keyStoreNode);
    const privateKey = await keyStoreRecover(keyStoreNode, walletPassword);
    if (privateKey == undefined) {
        return false;
    }
    
    const homeDirectory = await app.actions.getHomeDirectory.use();

    fs.writeFileSync(path.join(homeDirectory, 'id'), jsonKeyStoreNode.address);
    fs.writeFileSync(path.join(homeDirectory, 'keystore'), keyStoreNode);
    fs.writeFileSync(path.join(homeDirectory, 'moniker'), moniker);
    fs.writeFileSync(path.join(homeDirectory, 'chainId'), `${chainId}`);

    if (fs.existsSync(path.join(homeDirectory, 'settings.json'))) {
        const settings = JSON.parse(fs.readFileSync(path.join(homeDirectory, 'settings.json'), 'utf8'));
        settings.nodeMode = mode;
        fs.writeFileSync(path.join(homeDirectory, 'settings.json'), JSON.stringify(settings, null, 2));
    } else {
        fs.writeFileSync(path.join(homeDirectory, 'settings.json'), JSON.stringify({ nodeMode: mode }, null, 2));
    }

    let genesisContent = undefined;
    if (genesisURL != undefined) {
        genesisContent = (await fileGetContent(genesisURL)).toString();
    }

    // Only remove directories if not setting up from backup
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
    let configTomlPath = path.join(homeDirectory, 'config/config.toml');
    let configToml = fs.readFileSync(configTomlPath).toString();

    appToml = appToml.replace("tcp://localhost:1317", "tcp://0.0.0.0:1317");

    // if (mode == "prune-node") {
    //     appToml = appToml.replace("pruning = \"default\"", "pruning = \"custom\"");
    //     appToml = appToml.replace("pruning-keep-recent = \"0\"", "pruning-keep-recent = \"10000\"");
    //     appToml = appToml.replace("pruning-interval = \"0\"", "pruning-interval = \"100\"");
    // }

    configToml = configToml.replace(/timeout_commit \= \".*?\"/gm, `timeout_commit = "15000ms"`);

    if (genesisContent != undefined && genesisContent != '') { // sync to peer
        const destGenesisPath = path.join(homeDirectory, 'config/genesis.json');
        fs.writeFileSync(destGenesisPath, genesisContent);

        const peerNode = `${peerInfos.nodeId}@${peerInfos.nodeIP}:${peerInfos.nodeP2PPort}`;

        configToml = configToml.replace(/persistent_peers \= \"\"/gm, `persistent_peers = "${peerNode}"`);


        fs.writeFileSync(configTomlPath, configToml);
        fs.writeFileSync(appTomlPath, appToml);
    } else {

        fs.writeFileSync(configTomlPath, configToml);
        fs.writeFileSync(appTomlPath, appToml);
        
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