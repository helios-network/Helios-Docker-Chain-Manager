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

            // Check if required data files exist
            const requiredDataFiles = ['application.db', 'state.db', 'blockstore.db'];
            const missingDataFiles = requiredDataFiles.filter(file => !fs.existsSync(path.join(dataDir, file)));
            
            if (missingDataFiles.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: `Missing required data files: ${missingDataFiles.join(', ')}` 
                });
            }
            
            // Create a comprehensive backup including all configuration files
            // We'll create the backup from the home directory to include both data and config
            
            // Create persistent_peers.json from config.toml for backup
            const configTomlPath = path.join(homeDirectory, 'config', 'config.toml');
            const persistentPeersPath = path.join(homeDirectory, 'config', 'persistent_peers.json');
            if (fs.existsSync(configTomlPath)) {
                const configData = fs.readFileSync(configTomlPath, 'utf8');
                const match = (new RegExp(`persistent_peers \= "(.*)"`, 'gm')).exec(configData);
                let persistentPeers = [];
                if (match && match[1]) {
                    persistentPeers = match[1].split(',').map(x => x.trim()).filter(x => x.length > 0);
                }
                fs.writeFileSync(persistentPeersPath, JSON.stringify(persistentPeers, null, 2));
                console.log('persistent_peers.json created from config.toml');
            }
            
            // Create comprehensive backup including data and config files
            const backupFiles = [
                'data/application.db',
                'data/state.db', 
                'data/blockstore.db',
                'data/metadata.json',
                'config/genesis.json',
                'config/addrbook.json',
                'config/persistent_peers.json'
            ];
            
            // Check which files exist and create the backup
            const existingFiles = [];
            const missingFiles = [];
            
            for (const file of backupFiles) {
                const filePath = path.join(homeDirectory, file);
                if (fs.existsSync(filePath)) {
                    existingFiles.push(file);
                } else {
                    missingFiles.push(file);
                }
            }
            
            if (existingFiles.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'No files found to backup' 
                });
            }
            
            // Create tar.gz from home directory including all files
            const filesToBackup = existingFiles.join(' ');
            await execWrapper(`tar -czf "${backupPath}" -C "${homeDirectory}" ${filesToBackup}`);
            
            // Clean up temporary persistent_peers.json
            if (fs.existsSync(persistentPeersPath)) {
                fs.unlinkSync(persistentPeersPath);
                console.log('persistent_peers.json cleaned up');
            }
            

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