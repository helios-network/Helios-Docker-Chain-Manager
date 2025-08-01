const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const keyth = require('keythereum');
const { fileGetContent } = require('../utils/file-get-content');
const path = require('path');
const os = require('os');
const { setupNode } = require('../application/setup-node');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const decrypt2 = async (json, password) => {
    const keyobj = JSON.parse(json);
    const privateKey = keyth.recover(password,keyobj);
    console.log(privateKey.toString('hex'));
    return privateKey.toString('hex');
}

const setupNodeFromBackup = (app, environement) => {
    app.post('/setup-node-from-backup', async (req, res) => {
        try {
            const keyStoreNode = req.body['keyStoreNode'];
            const passwordCrypted = req.body['password'];
            const headerUrl = req.body['headerUrl'];
            const moniker = req.body['moniker'];
            const chainId = req.body['chainId'];
            const mode = req.body['mode'] == undefined ? "archive" : req.body['mode'];

            const homeDirectory = await app.actions.getHomeDirectory.use();
            
            // Create backup directory
            const backupDir = path.join(homeDirectory, 'backup-temp');
            if (fs.existsSync(backupDir)) {
                await execWrapper(`rm -rf ${backupDir}`);
            }
            fs.mkdirSync(backupDir, { recursive: true });

            try {
                // Download and extract the backup
                console.log('Downloading backup from:', headerUrl);
                
                // Download the header file first
                const headerContent = await fileGetContent(headerUrl);
                const headerData = JSON.parse(headerContent.toString());
                
                if (!headerData.downloadUrl) {
                    throw new Error('Invalid backup header file - missing downloadUrl');
                }

                // Download the actual backup file
                const backupFileName = `backup-${Date.now()}.tar.gz`;
                const backupFilePath = path.join(backupDir, backupFileName);
                
                console.log('Downloading backup file from:', headerData.downloadUrl);
                await execWrapper(`curl -L -o "${backupFilePath}" "${headerData.downloadUrl}"`);
                
                // Extract the backup
                console.log('Extracting backup...');
                await execWrapper(`cd "${backupDir}" && tar -xzf "${backupFileName}"`);
                
                // Check what was extracted
                const extractedItems = fs.readdirSync(backupDir);
                console.log('Extracted items:', extractedItems);
                
                // Find the extracted backup directory or use backupDir directly
                let extractedBackupPath;
                const extractedDirs = extractedItems.filter(item => {
                    const itemPath = path.join(backupDir, item);
                    return fs.statSync(itemPath).isDirectory() && item !== '__MACOSX';
                });
                
                // Always use backupDir as the backup path since the structure is:
                // backup-temp/
                // ├── backup-*.tar.gz (original file)
                // ├── config/ (config files)
                // └── data/ (data files)
                extractedBackupPath = backupDir;
                console.log('Backup extracted to:', extractedBackupPath);
                console.log('Using backup path:', extractedBackupPath);

                // Setup node from backup using the new setupNode function
                const success = await setupNode(
                    app, 
                    keyStoreNode, 
                    unrot13(atob(passwordCrypted)), 
                    moniker, 
                    chainId, 
                    undefined, // genesisURL not needed for backup
                    {}, // peerInfos not needed for backup
                    mode, 
                    true, // fromBackup = true
                    extractedBackupPath // backupPath
                );

                if (!success) {
                    throw new Error('Failed to setup node from backup');
                }

                // Clean up backup files
                await execWrapper(`rm -rf ${backupDir}`);
                
                app.node.setup = true;
                res.send({ status: 'ready', success: true });

            } catch (error) {
                // Clean up on error
                if (fs.existsSync(backupDir)) {
                    await execWrapper(`rm -rf ${backupDir}`);
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
    setupNodeFromBackup
}; 