const fs = require('fs');
const path = require('path');
const { execWrapperWithRes } = require('../utils/exec-wrapper');

const POSTApplyBackup = (app, environement) => {
    app.post('/apply-backup', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const { filename, backupCurrentData } = req.body;
            
            // Validate filename to prevent directory traversal
            if (!filename || !filename.match(/^snapshot_\d+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.tar\.gz$/)) {
                return res.status(400).json({ success: false, error: 'Invalid filename format' });
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
            
            const snapshotPath = path.join(backupDir, filename);
            const dataDir = path.join(homeDirectory, 'data');
            
            // Check if snapshot file exists
            if (!fs.existsSync(snapshotPath)) {
                return res.status(404).json({ success: false, error: 'Snapshot file not found' });
            }
            
            // Stop the node if it's running
            if (app.node && app.node.stop) {
                try {
                    await app.node.stop();
                    console.log('Node stopped for snapshot application');
                } catch (error) {
                    console.log('Error stopping node:', error.message);
                }
            }
            
            // Backup current data if requested
            if (backupCurrentData && fs.existsSync(dataDir)) {
                try {
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
                    
                    // Create tar.gz of current data
                    const result = await execWrapperWithRes(`tar -czf "${backupPath}" -C "${homeDirectory}" data`);

                    if (!result.success) {
                        return res.status(500).json({ success: false, error: 'Failed to create backup: ' + result.stderr });
                    }

                    console.log(`Current data backed up as: ${backupFilename}`);
                } catch (error) {
                    console.error('Error backing up current data:', error);
                    // Continue with snapshot application even if backup fails
                }
            }
            
            // Remove current data directory
            if (fs.existsSync(dataDir)) {
                fs.rmSync(dataDir, { recursive: true, force: true });
                console.log('Current data directory removed');
            }
            
            // Create new data directory
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('New data directory created');
            
            // Extract snapshot to home directory (comprehensive backup)
            const result = await execWrapperWithRes(`tar -xzf "${snapshotPath}" -C "${homeDirectory}"`);

            if (!result.success) {
                return res.status(500).json({ success: false, error: 'Failed to extract snapshot: ' + result.stderr });
            }

            console.log('Comprehensive backup extracted successfully');
            
            // Handle persistent_peers.json if it exists in config directory
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

            console.log('Snapshot extracted successfully');
            
            // Create priv_validator_state.json
            const validatorStatePath = path.join(dataDir, 'priv_validator_state.json');
            const validatorState = {
                "height": "0",
                "round": 0,
                "step": 0
            };
            
            fs.writeFileSync(validatorStatePath, JSON.stringify(validatorState, null, 2));
            console.log('priv_validator_state.json created');
            
            res.json({ 
                success: true, 
                message: 'Snapshot applied successfully',
                backupCreated: backupCurrentData
            });
            
        } catch (error) {
            console.error('Error applying snapshot:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    POSTApplyBackup
}; 