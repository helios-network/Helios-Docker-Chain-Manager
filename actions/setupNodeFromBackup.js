const { generateJsonKeyStore } = require("../application/generate-json-keystore");
const { setupNode } = require("../application/setup-node");
const { fileGetContent } = require('../utils/file-get-content');
const fs = require('fs');
const path = require('path');
const { execWrapper } = require('../utils/exec-wrapper');

const action = async (app, environement, action) => {

    const isRequired = ['walletPassword', 'walletPrivateKey', 'headerUrl', 'moniker', 'chainId'].reduce((acc, key) => {
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
    const headerUrl = action.headerUrl;
    const moniker = action.moniker;
    const chainId = action.chainId;
    const mode = action.mode || "archive";

    console.log(`Setting up node from backup: ${headerUrl}`);

    // Step 1: Download and parse the header file
    console.log('Downloading header file...');
    const headerResponse = await fetch(headerUrl);
    
    if (!headerResponse.ok) {
        console.log(`Failed to download header file: ${headerResponse.statusText}`);
        return false;
    }
    
    const headerData = await headerResponse.json();
    
    if (!headerData.filename || !headerData.downloadUrl) {
        console.log('Invalid header file format: missing filename or downloadUrl');
        return false;
    }
    
    console.log(`Header file parsed successfully. Backup file: ${headerData.filename}`);
    
    // Step 2: Get home directory and create necessary directories
    const homeDirectory = await app.actions.getHomeDirectory.use();
    const backupsDir = path.join(homeDirectory, 'backups');
    
    // Ensure backups directory exists
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    // Step 3: Download the actual backup file
    console.log('Downloading backup file...');
    const backupResponse = await fetch(headerData.downloadUrl);
    
    if (!backupResponse.ok) {
        console.log(`Failed to download backup file: ${backupResponse.statusText}`);
        return false;
    }
    
    // Step 4: Save the backup file locally
    const backupPath = path.join(backupsDir, headerData.filename);
    const backupBuffer = await backupResponse.arrayBuffer();
    fs.writeFileSync(backupPath, Buffer.from(backupBuffer));
    
    console.log(`Backup file saved to: ${backupPath}`);
    
    // Step 5: Use chainId from action parameters (like new genesis)
    const genesisURL = undefined; // undefined for new genesis
    
    // Step 6: Setup the node exactly like POST-setup-node.js
    console.log('Setting up node like POST-setup-node.js...');
    
    const nodeIP = undefined; // no peer for backup setup
    const nodeId = undefined;
    const nodeGRPCPort = undefined;
    const nodeRPCPort = undefined;
    const nodeP2PPort = undefined;
    
    let genesisContent = undefined;
    if (nodeIP != undefined && nodeIP != '') {
        genesisContent = (await fileGetContent(genesisURL)).toString();
    }

    await setupNode(app, keyStoreNode, action.walletPassword, moniker, chainId, genesisURL, {
        nodeIP: nodeIP,
        nodeId: nodeId,
        nodeGRPCPort: nodeGRPCPort,
        nodeRPCPort: nodeRPCPort,
        nodeP2PPort: nodeP2PPort
    }, mode);

    app.node.setup = true;

    // Step 7: Stop the node if it's running before applying backup
    if (app.node && app.node.stop) {
        try {
            await app.node.stop();
            console.log('Node stopped for backup application');
        } catch (error) {
            console.log('Error stopping node:', error.message);
        }
    }

    // Step 8: Extract the backup to home directory (this will override the genesis and data)
    console.log('Extracting backup...');
    const extractResult = await execWrapper(`tar -xzf "${backupPath}" -C "${homeDirectory}"`);
    
    if (extractResult === false) {
        console.log('Failed to extract backup file');
        return false;
    }
    
    console.log('Backup extracted successfully');

    // Step 9: Update the moniker in the extracted configuration
    if (fs.existsSync(path.join(homeDirectory, 'config', 'config.toml'))) {
        let configToml = fs.readFileSync(path.join(homeDirectory, 'config', 'config.toml'), 'utf8');
        configToml = configToml.replace(/moniker = ".*?"/gm, `moniker = "${moniker}"`);
        fs.writeFileSync(path.join(homeDirectory, 'config', 'config.toml'), configToml);
        console.log('Updated moniker in config.toml');
    }

    // Step 10: Handle persistent_peers.json if it exists
    const persistentPeersPath = path.join(homeDirectory, 'config', 'persistent_peers.json');
    if (fs.existsSync(persistentPeersPath)) {
        try {
            const persistentPeersData = JSON.parse(fs.readFileSync(persistentPeersPath, 'utf8'));
            const configTomlPath = path.join(homeDirectory, 'config', 'config.toml');
            
            if (fs.existsSync(configTomlPath)) {
                // Use the node function to restore persistent peers
                if (app.node && app.node.restorePersistentPeersFromBackup) {
                    await app.node.restorePersistentPeersFromBackup(persistentPeersData);
                } else {
                    // Fallback to direct file manipulation
                    const configData = fs.readFileSync(configTomlPath, 'utf8');
                    const peersString = persistentPeersData.join(',');
                    const newConfigData = configData.replace(
                        new RegExp(`persistent_peers \= "(.*)"`, 'gm'), 
                        `persistent_peers = "${peersString}"`
                    );
                    fs.writeFileSync(configTomlPath, newConfigData);
                    console.log('persistent_peers restored to config.toml (fallback)');
                }
                console.log('persistent_peers restored to config.toml');
            }
            
            // Clean up temporary persistent_peers.json
            fs.unlinkSync(persistentPeersPath);
        } catch (error) {
            console.error('Error restoring persistent_peers:', error);
        }
    }

    // Step 11: Create priv_validator_state.json if it doesn't exist
    const validatorStatePath = path.join(homeDirectory, 'data', 'priv_validator_state.json');
    if (!fs.existsSync(validatorStatePath)) {
        const validatorState = {
            "height": "0",
            "round": 0,
            "step": 0
        };
        fs.writeFileSync(validatorStatePath, JSON.stringify(validatorState, null, 2));
        console.log('priv_validator_state.json created');
    }

    // Step 12: Update the moniker file in home directory
    fs.writeFileSync(path.join(homeDirectory, 'moniker'), moniker);

    // Step 13: Clean up the downloaded backup file
    try {
        fs.unlinkSync(backupPath);
        console.log('Backup file cleaned up');
    } catch (error) {
        console.log('Could not clean up backup file:', error.message);
    }

    console.log('Node setup from backup action completed successfully');
    return true;
}

module.exports = {
    action
} 