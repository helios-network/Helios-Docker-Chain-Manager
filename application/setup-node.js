const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const { fileGetContent } = require('../utils/file-get-content');
const path = require('path');
const os = require('os');
const { keyStoreRecover } = require('../utils/key-store');

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
    if (genesisContent != undefined && genesisContent != '') {
        fs.writeFileSync(path.join(homeDirectory, 'genesis.json'), genesisContent.toString());
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

        // genesisJson.app_state.staking.params.bond_denom = "ahelios";
        // genesisJson.app_state.crisis.constant_fee.denom = "ahelios";
        // genesisJson.app_state.gov.params.min_deposit[0].denom = "ahelios";
        // genesisJson.app_state.gov.params.min_initial_deposit_ratio = "0.100000000000000000";
        // genesisJson.app_state.gov.params.voting_period = "30s";
        // genesisJson.app_state.gov.params.expedited_voting_period = "10s";
        // genesisJson.app_state.mint.params.mint_denom = "ahelios";
        // genesisJson.app_state.staking.params.unbonding_time = "5s";

        genesisJson.app_state.staking.params.epoch_length = "100"; // Set epoch_length to 100
        genesisJson.app_state.staking.params.validators_per_epoch = "100"; // Set validators_per_epoch to 100
        genesisJson.app_state.staking.params.epoch_enabled = true; // Enable epoch-based validator rotation

        genesisJson.app_state.staking.params.stake_weight_factor = "85"; // Enable epoch-based validator rotation
        genesisJson.app_state.staking.params.baseline_chance_factor = "5";
        genesisJson.app_state.staking.params.randomness_factor = "10";
        genesisJson.app_state.staking.params.treasury_address = "helios1aj2gcctecp874q90jclsuk6c2k6kvdthwek60l";

        // New parameters for delegator stake reduction
        genesisJson.app_state.staking.params.delegator_stake_reduction = {
            enabled: true,
            dominance_threshold: "0.05",
            max_reduction: "0.90",
            curve_steepness: "10.0"
        };

        genesisJson.consensus.params.block.max_gas = "500000000" // (500000000 == 1000 normal tx)
        
        // genesisJson.app_state.auction.params.auction_period = "10";
        // genesisJson.app_state.ocr.params.module_admin = 'helios1q0d2nv8xpf9qy22djzgrkgrrcst9frcs34fqra';
        // genesisJson.app_state.ocr.params.payout_block_interval = "5";
        
        fs.writeFileSync(genesisPath, JSON.stringify(genesisJson, null, 2));
        /////////////////////////

        let address = await execWrapper(`heliades keys show user0 -a --keyring-backend="local"`)
        await execWrapper(`heliades add-genesis-account --chain-id ${chainId} ${address.trim()} 1000000000000000000000000ahelios --keyring-backend="local"`);
       // REMOVE WHEN TESTNET
        const treasuryAddress = "helios1aj2gcctecp874q90jclsuk6c2k6kvdthwek60l";
        await execWrapper(`heliades add-genesis-account --chain-id ${chainId} ${treasuryAddress} 100ahelios --keyring-backend="local"`);
        
        await execWrapper(`heliades gentx user0 1000000000000000000000ahelios --chain-id ${chainId} --keyring-backend="local" --gas-prices "1000000000ahelios"`);
        await execWrapper(`heliades collect-gentxs`);
        await execWrapper(`heliades validate-genesis`);
    }
    return true;
}

module.exports = {
    setupNode
};