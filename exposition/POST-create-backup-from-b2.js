const fs = require('fs');
const path = require('path');
const { execWrapper } = require('../utils/exec-wrapper');
const { pipeline } = require('stream/promises');

const createBackupFromB2 = (app, environement) => {
    app.post('/create-backup-from-b2', async (req, res) => {
        try {
            const { headerUrl } = req.body;
            
            if (!headerUrl) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Header URL is required' 
                });
            }
            
            if (!headerUrl.endsWith('.b2header.json') && !headerUrl.endsWith('.header.json')) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'URL must end with .b2header.json or .header.json' 
                });
            }
            
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const backupsDir = path.join(homeDirectory, 'backups');
            
            // Ensure backups directory exists
            if (!fs.existsSync(backupsDir)) {
                fs.mkdirSync(backupsDir, { recursive: true });
            }
            
            console.log(`Creating backup from B2 header URL: ${headerUrl}`);
            
            // Step 1: Download and parse the header file
            console.log('Downloading header file...');
            const headerResponse = await fetch(headerUrl);
            
            if (!headerResponse.ok) {
                return res.status(400).json({ 
                    success: false, 
                    error: `Failed to download header file: ${headerResponse.statusText}` 
                });
            }
            
            const headerData = await headerResponse.json();
            
            if (!headerData.filename || !headerData.downloadUrl) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid header file format: missing filename or downloadUrl' 
                });
            }
            
            console.log(`Header file parsed successfully. Backup file: ${headerData.filename}`);
            
            // Step 2: Download the actual backup file
            console.log('Downloading backup file...');
            const backupResponse = await fetch(headerData.downloadUrl);
            
            if (!backupResponse.ok) {
                return res.status(400).json({ 
                    success: false, 
                    error: `Failed to download backup file: ${backupResponse.statusText}` 
                });
            }
            
            // Step 3: Save the backup file locally
            const backupPath = path.join(backupsDir, headerData.filename);
            const fileStream = fs.createWriteStream(backupPath);
            await pipeline(backupResponse.body, fileStream);
            
            console.log(`Backup file saved to: ${backupPath}`);
            
            // Step 4: Verify the backup file
            if (!fs.existsSync(backupPath)) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Failed to save backup file locally' 
                });
            }
            
            // Get file stats
            const stats = fs.statSync(backupPath);
            const fileSize = stats.size;
            
            console.log(`Backup created successfully. Size: ${fileSize} bytes`);
            
            return res.json({
                success: true,
                message: 'Backup created successfully from B2 link',
                backup: {
                    filename: headerData.filename,
                    path: backupPath,
                    size: fileSize,
                    blockId: headerData.blockId,
                    uploadedAt: headerData.uploadedAt,
                    description: headerData.description
                }
            });
            
        } catch (error) {
            console.error('Error creating backup from B2:', error);
            return res.status(500).json({ 
                success: false, 
                error: `Internal server error: ${error.message}` 
            });
        }
    });
};

module.exports = {
    createBackupFromB2
};