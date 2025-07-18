const fs = require('fs');
const path = require('path');

const GETBackupDownload = (app, environement) => {
    app.get('/backup-download/:filename', async (req, res) => {
        
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const filename = req.params.filename;
            
            // Validate filename to prevent directory traversal
            if (!filename.match(/^snapshot_\d+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.tar\.gz$/)) {
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
            
            const filePath = path.join(backupDir, filename);
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ success: false, error: 'Backup file not found' });
            }
            
            // Set headers for file download
            res.setHeader('Content-Type', 'application/gzip');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            // Stream the file
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            
        } catch (error) {
            console.error('Error downloading backup:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    GETBackupDownload
}; 