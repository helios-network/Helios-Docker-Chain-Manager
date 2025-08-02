const { restoreBackup } = require('../application/restoreBackup');

const POSTApplyBackup = (app, environement) => {
    app.post('/apply-backup', async (req, res) => {
        try {
            const { filename, backupCurrentData } = req.body;
            
            const result = await restoreBackup(app, filename, backupCurrentData);
            
            if (result.success) {
                res.json({ 
                    success: true, 
                    message: result.message,
                    backupCreated: result.currentBackupCreated
                });
            } else {
                res.status(500).json({ success: false, error: result.error });
            }
            
        } catch (error) {
            console.error('Error applying backup:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    POSTApplyBackup
}; 