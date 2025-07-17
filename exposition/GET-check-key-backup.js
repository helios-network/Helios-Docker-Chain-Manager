const fs = require('fs');
const path = require('path');

const GETCheckKeyBackup = (app, environement) => {
    app.get('/check-key-backup', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const backupPath = path.join(homeDirectory, 'key-backup', 'keys.tar.gz');
            
            if (!fs.existsSync(backupPath)) {
                return res.json({ 
                    success: true, 
                    exists: false 
                });
            }
            
            // Get file information
            const stats = fs.statSync(backupPath);
            const fileSize = (stats.size / 1024).toFixed(2); // KB
            const createdDate = stats.birthtime;
            const modifiedDate = stats.mtime;
            
            res.json({ 
                success: true, 
                exists: true,
                backupPath: backupPath,
                fileSize: fileSize + ' KB',
                createdDate: createdDate,
                modifiedDate: modifiedDate
            });
            
        } catch (error) {
            console.error('Error checking key backup:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });
};

module.exports = {
    GETCheckKeyBackup
}; 