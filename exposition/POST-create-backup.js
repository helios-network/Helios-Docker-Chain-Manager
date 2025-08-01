const fs = require('fs');
const path = require('path');
const { execWrapper } = require('../utils/exec-wrapper');

const POSTCreateBackup = (app, environement) => {
    app.post('/create-backup', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const dataDir = path.join(homeDirectory, 'data');
            
            // Check if data directory exists
            if (!fs.existsSync(dataDir)) {
                return res.status(404).json({ success: false, error: 'Data directory not found' });
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
            
            // Create backup directory if it doesn't exist
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            // Read current block height from metadata.json
            let currentBlockHeight = 0;
            const metadataPath = path.join(dataDir, 'metadata.json');
            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                currentBlockHeight = metadata.height || 0;
            }
            
            // Create backup filename with current timestamp
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
            const backupFilename = `snapshot_${currentBlockHeight}_${timestamp}.tar.gz`;
            const backupPath = path.join(backupDir, backupFilename);
            
            // copie genesis.json to data directory if exists
            if (fs.existsSync(path.join(homeDirectory, 'config', 'genesis.json'))) {
                fs.copyFileSync(path.join(homeDirectory, 'config', 'genesis.json'), path.join(homeDirectory, 'data', 'genesis.json'));
            } else {
                return res.status(500).json({ success: false, error: 'Genesis file not found' });
            }

            // Check if required files exist
            const requiredFiles = ['application.db', 'state.db', 'blockstore.db', 'genesis.json'];
            const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(dataDir, file)));
            
            if (missingFiles.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: `Missing required files: ${missingFiles.join(', ')}` 
                });
            }
            
            // Create tar.gz of specific files
            const filesToBackup = requiredFiles.join(' ');
            await execWrapper(`tar -czf "${backupPath}" -C "${dataDir}" ${filesToBackup}`);
            

            // remove genesis.json from data directory
            if (fs.existsSync(path.join(dataDir, 'genesis.json'))) {
                fs.unlinkSync(path.join(dataDir, 'genesis.json'));
            }

            // Get file size
            const stats = fs.statSync(backupPath);
            
            res.json({ 
                success: true, 
                message: 'Backup created successfully',
                backup: {
                    filename: backupFilename,
                    blockHeight: currentBlockHeight,
                    size: stats.size,
                    path: backupPath
                }
            });
            
        } catch (error) {
            console.error('Error creating backup:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    POSTCreateBackup
}; 