const fs = require('fs');
const path = require('path');
const { execWrapper } = require('../utils/exec-wrapper');

const POSTCreateKeyBackup = (app, environement) => {
    app.post('/create-key-backup', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            
            // Define the files to backup
            const filesToBackup = [
                path.join(homeDirectory, 'config', 'node_key.json'),
                path.join(homeDirectory, 'config', 'priv_validator_key.json'),
                path.join(homeDirectory, 'keyring-local')
            ];
            
            // Check if files exist
            const existingFiles = [];
            const missingFiles = [];
            
            for (const file of filesToBackup) {
                if (fs.existsSync(file)) {
                    existingFiles.push(file);
                } else {
                    missingFiles.push(path.basename(file));
                }
            }
            
            if (existingFiles.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'No key files found to backup' 
                });
            }
            
            // Create backup directory if it doesn't exist
            const backupDir = path.join(homeDirectory, 'key-backup');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const backupPath = path.join(backupDir, 'keys.tar.gz');
            
            // Create tar.gz backup
            const tarCommand = `tar -czf "${backupPath}" -C "${homeDirectory}" config/node_key.json config/priv_validator_key.json keyring-local`;
            
            await execWrapper(tarCommand);
            
            // Get file size
            const stats = fs.statSync(backupPath);
            const fileSize = (stats.size / 1024).toFixed(2); // KB
            
            console.log(`Key backup created successfully: ${backupPath} (${fileSize} KB)`);
            
            res.json({ 
                success: true, 
                message: 'Key backup created successfully',
                backupPath: backupPath,
                fileSize: fileSize + ' KB',
                includedFiles: existingFiles.map(f => path.basename(f)),
                missingFiles: missingFiles
            });
            
        } catch (error) {
            console.error('Error creating key backup:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });
};

module.exports = {
    POSTCreateKeyBackup
}; 