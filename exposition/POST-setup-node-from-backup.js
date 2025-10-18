const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const { fileGetContent } = require('../utils/file-get-content');
const path = require('path');
const { setupNodeFromBackup } = require('../application/setupNodeFromBackup');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const setupNodeFromBackupEndpoint = (app, environment) => {
    app.post('/setup-node-from-backup', async (req, res) => {
        try {
            const keyStoreNode = req.body['keyStoreNode'];
            const passwordCrypted = req.body['password'];
            const headerUrl = req.body['headerUrl'];
            const moniker = req.body['moniker'];
            const chainId = req.body['chainId'];
            const mode = req.body['mode'] == undefined ? "archive" : req.body['mode'];

            const homeDirectory = await app.actions.getHomeDirectory.use();
            
            const tempDir = path.join(homeDirectory, 'backup-temp');
            if (fs.existsSync(tempDir)) {
                await execWrapper(`rm -rf ${tempDir}`);
            }
            fs.mkdirSync(tempDir, { recursive: true });

            try {
                const headerContent = await fileGetContent(headerUrl);
                const headerData = JSON.parse(headerContent.toString());
                
                if (!headerData.downloadUrl) {
                    throw new Error('Invalid backup header file - missing downloadUrl');
                }

                // Clean up URL that might have double https:// protocol
                const cleanDownloadUrl = headerData.downloadUrl.replace(/^https:\/\/https:\/\//, 'https://');

                const backupFileName = `backup-${Date.now()}.tar.gz`;
                const backupFilePath = path.join(tempDir, backupFileName);

                await execWrapper(`curl -L -o "${backupFilePath}" "${cleanDownloadUrl}"`);
                
                if (!fs.existsSync(backupFilePath)) {
                    throw new Error('Failed to download backup file');
                }

                const success = await setupNodeFromBackup(
                    app, 
                    keyStoreNode, 
                    unrot13(atob(passwordCrypted)), 
                    moniker, 
                    chainId, 
                    mode, 
                    backupFilePath
                );

                if (!success) {
                    throw new Error('Failed to setup node from backup');
                }

                await execWrapper(`rm -rf ${tempDir}`);
                
                app.node.setup = true;
                res.send({ status: 'ready', success: true });

            } catch (error) {
                if (fs.existsSync(tempDir)) {
                    await execWrapper(`rm -rf ${tempDir}`);
                }
                throw error;
            }

        } catch (e) {
            console.error('Setup from backup failed:', e);
            res.send({ status: 'ko', error: e.message });
        }
    });
};

module.exports = {
    setupNodeFromBackup: setupNodeFromBackupEndpoint
}; 