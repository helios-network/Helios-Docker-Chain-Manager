const fs = require('fs');
const path = require('path');

const GETBackups = (app, environement) => {
    app.get('/get-backups', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            
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
            
            // Check if backup directory exists
            if (!fs.existsSync(backupDir)) {
                return res.json({ success: true, backups: [] });
            }
            
            // Read directory and filter for backup files
            const files = fs.readdirSync(backupDir);
            const backupFiles = files
                .filter(file => file.startsWith('snapshot_') && file.endsWith('.tar.gz'))
                .map(file => {
                    // Parse filename: snapshot_7560_2025-07-17_10-41-35.tar.gz
                    const match = file.match(/snapshot_(\d+)_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.tar\.gz/);
                    if (match) {
                        const [, blockId, dateTime] = match;
                        const [date, time] = dateTime.split('_');
                        const formattedDateTime = `${date} ${time.replace(/-/g, ':')}`;
                        
                        return {
                            filename: file,
                            blockId: parseInt(blockId),
                            date: date,
                            time: time.replace(/-/g, ':'),
                            formattedDateTime: formattedDateTime,
                            fullPath: path.join(backupDir, file),
                            size: fs.statSync(path.join(backupDir, file)).size
                        };
                    }
                    return null;
                })
                .filter(file => file !== null)
                .sort((a, b) => b.blockId - a.blockId); // Sort by blockId descending
            
            res.json({ success: true, backups: backupFiles });
        } catch (error) {
            console.error('Error loading backups:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    GETBackups
}; 