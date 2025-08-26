const { execWrapper } = require('../utils/exec-wrapper');
const fs = require('fs');
const path = require('path');

const listBackups = async (app) => {
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
            return {
                success: true,
                backups: []
            };
        }
        
        const backupFiles = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.tar.gz'))
            .map(filename => {
                const filePath = path.join(backupDir, filename);
                const stats = fs.statSync(filePath);
                
                const blockHeightMatch = filename.match(/snapshot_(\d+)_/);
                const blockHeight = blockHeightMatch ? parseInt(blockHeightMatch[1]) : 0;
                
                const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
                const date = dateMatch ? dateMatch[1].replace('_', 'T') : null;
                
                return {
                    filename: filename,
                    blockHeight: blockHeight,
                    size: stats.size,
                    date: date,
                    path: filePath
                };
            })
            .sort((a, b) => b.blockHeight - a.blockHeight);
        
        return {
            success: true,
            backups: backupFiles
        };
        
    } catch (error) {
        console.error('Error listing backups:', error);
        return {
            success: false,
            error: error.message,
            backups: []
        };
    }
};

module.exports = {
    listBackups
}; 