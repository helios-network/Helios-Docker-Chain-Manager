const { execWrapper } = require('../utils/exec-wrapper');
const fs = require('fs');
const path = require('path');

const createBackup = async (app) => {
    try {
        const homeDirectory = await app.actions.getHomeDirectory.use();
        
        let backupDir = path.join(homeDirectory, 'backups');
        
        const settingsPath = path.join(homeDirectory, 'settings.json');
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            if (settings.backupDir) {
                backupDir = settings.backupDir;
                if (!path.isAbsolute(backupDir)) {
                    backupDir = path.join(homeDirectory, backupDir);
                }
            }
        }
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const result = await execWrapper(`cd "${backupDir}" && heliades backups dump --home "${homeDirectory}"`);
        
        const backupFiles = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.tar.gz'))
            .sort()
            .reverse();
        
        if (backupFiles.length === 0) {
            throw new Error('No backup file was created');
        }
        
        const latestBackup = backupFiles[0];
        const backupPath = path.join(backupDir, latestBackup);
        const stats = fs.statSync(backupPath);
        
        const blockHeightMatch = latestBackup.match(/snapshot_(\d+)_/);
        const blockHeight = blockHeightMatch ? parseInt(blockHeightMatch[1]) : 0;
        
        return {
            success: true,
            backup: {
                filename: latestBackup,
                blockHeight: blockHeight,
                size: stats.size,
                path: backupPath
            }
        };
        
    } catch (error) {
        console.error('Error creating backup:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    createBackup
}; 