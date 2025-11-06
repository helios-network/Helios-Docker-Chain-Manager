const fs = require('fs');
const path = require('path');
const multer = require('multer');

const POSTUploadKeyBackup = (app, environement) => {
    app.post('/upload-key-backup', multer({ storage: multer.memoryStorage() }).any(), async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const backupDir = path.join(homeDirectory, 'key-backup');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // extract from formdata the file
            const file = req.files[0];
            if (!file) {
                return res.status(400).json({ success: false, error: 'No file provided' });
            }

            const backupPath = path.join(backupDir, 'keys.tar.gz');
            if (fs.existsSync(backupPath)) {
                let i = 1;
                while (fs.existsSync(path.join(backupDir, 'keys.tar.gz.old-' + i))) {
                    i++;
                }
                fs.renameSync(backupPath, path.join(backupDir, 'keys.tar.gz.old-' + i));
            }
            fs.writeFileSync(backupPath, file.buffer);
            res.status(200).json({ success: true, message: 'Key backup uploaded successfully' });
        } catch (error) {
            console.error('Error uploading key backup:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });
};

module.exports = {
    POSTUploadKeyBackup
}; 