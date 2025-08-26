const fetchB2BackupInfo = (app, environement) => {
    app.post('/fetch-b2-backup-info', async (req, res) => {
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
            
            console.log(`Fetching B2 backup info from: ${headerUrl}`);
            
            // Download and parse the header file
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
            
            console.log(`B2 backup info fetched successfully: ${headerData.filename}`);
            
            return res.json({
                success: true,
                backup: {
                    filename: headerData.filename,
                    blockId: headerData.blockId,
                    uploadedAt: headerData.uploadedAt,
                    description: headerData.description,
                    downloadUrl: headerData.downloadUrl
                }
            });
            
        } catch (error) {
            console.error('Error fetching B2 backup info:', error);
            return res.status(500).json({ 
                success: false, 
                error: `Internal server error: ${error.message}` 
            });
        }
    });
};

module.exports = {
    fetchB2BackupInfo
}; 