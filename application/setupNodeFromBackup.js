const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const path = require('path');
const { setupNode } = require('./setup-node');
const { restoreBackup } = require('./restoreBackup');

const setupNodeFromBackup = async (app, keyStoreNode, walletPassword, moniker, chainId, mode = "archive", backupFilePath) => {
    try {
        const homeDirectory = await app.actions.getHomeDirectory.use();
        
        const setupSuccess = await setupNode(
            app, 
            keyStoreNode, 
            walletPassword, 
            moniker, 
            chainId, 
            undefined,
            {},
            mode
        );
        
        if (!setupSuccess) {
            throw new Error('Failed to setup node normally');
        }
        
        const backupsDir = path.join(homeDirectory, 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }
        
        const backupFileName = path.basename(backupFilePath);
        const backupDestPath = path.join(backupsDir, backupFileName);
        fs.copyFileSync(backupFilePath, backupDestPath);
        
        const restoreSuccess = await restoreBackup(app, backupFileName, false);
        
        if (!restoreSuccess.success) {
            throw new Error(`Failed to restore backup: ${restoreSuccess.error}`);
        }
        
        return true;
        
    } catch (error) {
        console.error('Error setting up node from backup:', error);
        return false;
    }
};

module.exports = {
    setupNodeFromBackup
}; 