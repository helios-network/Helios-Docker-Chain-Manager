const { execWrapper } = require('../utils/exec-wrapper');
const fs = require('fs');
const path = require('path');

const restoreBackup = async (app, filename, backupCurrentData = false) => {
    try {
        const homeDirectory = await app.actions.getHomeDirectory.use();
        
        if (!filename || !filename.match(/^snapshot_\d+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.tar\.gz$/)) {
            throw new Error('Invalid filename format');
        }
        
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
        
        const snapshotPath = path.join(backupDir, filename);
        
        if (!fs.existsSync(snapshotPath)) {
            throw new Error('Snapshot file not found');
        }
        
        if (app.node && app.node.stop) {
            try {
                await app.node.stop();
            } catch (error) {
                console.log('Error stopping node:', error.message);
            }
        }
        
        // Create backup of current data if requested
        let currentBackupCreated = false;
        if (backupCurrentData) {
            try {
                const currentBackupResult = await require('./createBackup').createBackup(app);
                if (currentBackupResult.success) {
                    currentBackupCreated = true;
                }
            } catch (error) {
                console.error('Error backing up current data:', error);
            }
        }
        
        const result = await execWrapper(`cd "${backupDir}" && heliades backups restore "${filename}" --home "${homeDirectory}"`);

        return {
            success: true,
            message: 'Backup restored successfully',
            currentBackupCreated: currentBackupCreated
        };
        
    } catch (error) {
        console.error('Error restoring backup:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    restoreBackup
}; 