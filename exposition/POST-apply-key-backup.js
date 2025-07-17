const fs = require('fs');
const path = require('path');
const { execWrapper } = require('../utils/exec-wrapper');

const POSTApplyKeyBackup = (app, environement) => {
    app.post('/apply-key-backup', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const backupPath = path.join(homeDirectory, 'key-backup', 'keys.tar.gz');
            
            if (!fs.existsSync(backupPath)) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Key backup file not found' 
                });
            }
            
            // Create temporary directory for extraction
            const tempDir = path.join(homeDirectory, 'key-backup', 'temp');
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            fs.mkdirSync(tempDir, { recursive: true });
            
            // Extract the backup to temporary directory
            const extractCommand = `tar -xzf "${backupPath}" -C "${tempDir}"`;

            await execWrapper(extractCommand);
            
            if (!fs.existsSync(tempDir)) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Failed to extract key backup using tar' 
                });
            }
            
            // Backup current files before replacing
            const currentBackupDir = path.join(homeDirectory, 'key-backup', 'current-backup-' + Date.now());
            fs.mkdirSync(currentBackupDir, { recursive: true });
            
            const filesToBackup = [
                { src: path.join(homeDirectory, 'config', 'node_key.json'), dest: path.join(currentBackupDir, 'node_key.json') },
                { src: path.join(homeDirectory, 'config', 'priv_validator_key.json'), dest: path.join(currentBackupDir, 'priv_validator_key.json') },
                { src: path.join(homeDirectory, 'keyring-local'), dest: path.join(currentBackupDir, 'keyring-local') }
            ];
            
            // Backup current files
            for (const file of filesToBackup) {
                if (fs.existsSync(file.src)) {
                    if (fs.statSync(file.src).isDirectory()) {
                        // Copy directory
                        fs.cpSync(file.src, file.dest, { recursive: true });
                    } else {
                        // Copy file
                        fs.copyFileSync(file.src, file.dest);
                    }
                }
            }
            
            // Replace files with backup files
            const filesToReplace = [
                { src: path.join(tempDir, 'config', 'node_key.json'), dest: path.join(homeDirectory, 'config', 'node_key.json') },
                { src: path.join(tempDir, 'config', 'priv_validator_key.json'), dest: path.join(homeDirectory, 'config', 'priv_validator_key.json') },
                { src: path.join(tempDir, 'keyring-local'), dest: path.join(homeDirectory, 'keyring-local') }
            ];
            
            for (const file of filesToReplace) {
                if (fs.existsSync(file.src)) {
                    // Ensure destination directory exists
                    const destDir = path.dirname(file.dest);
                    if (!fs.existsSync(destDir)) {
                        fs.mkdirSync(destDir, { recursive: true });
                    }
                    
                    if (fs.statSync(file.src).isDirectory()) {
                        // Remove existing directory and copy new one
                        if (fs.existsSync(file.dest)) {
                            fs.rmSync(file.dest, { recursive: true, force: true });
                        }
                        fs.cpSync(file.src, file.dest, { recursive: true });
                    } else {
                        // Copy file
                        fs.copyFileSync(file.src, file.dest);
                    }
                }
            }
            
            // Clean up temporary directory
            fs.rmSync(tempDir, { recursive: true, force: true });
            
            console.log(`Key backup applied successfully. Previous keys backed up to: ${currentBackupDir}`);
            
            res.json({ 
                success: true, 
                message: 'Key backup applied successfully',
                previousBackupLocation: currentBackupDir
            });
            
        } catch (error) {
            console.error('Error applying key backup:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });
};

module.exports = {
    POSTApplyKeyBackup
}; 