const fs = require('fs');
const path = require('path');

const GETBackupPreview = (app, environement) => {
    app.get('/get-backup-preview', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const dataDir = path.join(homeDirectory, 'data');
            
            // Check if data directory exists
            if (!fs.existsSync(dataDir)) {
                return res.json({ 
                    success: true, 
                    canCreateBackup: false,
                    error: 'Data directory not found'
                });
            }
            
            // Determine backup directory
            let backupDir = path.join(homeDirectory, 'backups'); // default
            
            // Check if custom backup directory is set in settings
            const settingsPath = path.join(homeDirectory, 'settings.json');
            if (fs.existsSync(settingsPath)) {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                if (settings.backupDir) {
                    backupDir = settings.backupDir;
                    // If it's a relative path, make it absolute from home directory
                    if (!path.isAbsolute(backupDir)) {
                        backupDir = path.join(homeDirectory, backupDir);
                    }
                }
            }
            
            // Check if required files exist
            const requiredFiles = ['application.db', 'state.db', 'blockstore.db'];
            const existingFiles = requiredFiles.filter(file => fs.existsSync(path.join(dataDir, file)));
            const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(dataDir, file)));
            
            // Read current block height from metadata.json
            let currentBlockHeight = 0;
            const metadataPath = path.join(dataDir, 'metadata.json');
            if (fs.existsSync(metadataPath)) {
                try {
                    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    currentBlockHeight = metadata.height || 0;
                } catch (error) {
                    console.error('Error reading metadata.json:', error);
                }
            }
            
            // Determine if backup is possible
            const canCreateBackup = existingFiles.length === requiredFiles.length && currentBlockHeight > 0;
            
            res.json({ 
                success: true,
                canCreateBackup: canCreateBackup,
                blockHeight: currentBlockHeight,
                files: existingFiles,
                missingFiles: missingFiles,
                backupDir: backupDir,
                error: canCreateBackup ? null : 'Blockchain not initialized or missing required files'
            });
            
        } catch (error) {
            console.error('Error getting backup preview:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    GETBackupPreview
}; 