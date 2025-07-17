const fs = require('fs');
const path = require('path');

const GETDownloadKeyBackup = (app, environement) => {
    app.get('/download-key-backup', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const backupPath = path.join(homeDirectory, 'key-backup', 'keys.tar.gz');
            
            if (!fs.existsSync(backupPath)) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Key backup file not found' 
                });
            }
            
            // Set headers for file download
            res.setHeader('Content-Type', 'application/gzip');
            res.setHeader('Content-Disposition', 'attachment; filename="keys.tar.gz"');
            
            // Stream the file
            const fileStream = fs.createReadStream(backupPath);
            fileStream.pipe(res);
            
        } catch (error) {
            console.error('Error downloading key backup:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });
};

module.exports = {
    GETDownloadKeyBackup
}; 