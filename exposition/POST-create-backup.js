const { createBackup } = require('../application/createBackup');

const POSTCreateBackup = (app, environement) => {
    app.post('/create-backup', async (req, res) => {
        try {
            const result = await createBackup(app);
            
            if (result.success) {
                res.json({ 
                    success: true, 
                    message: 'Backup created successfully using Go command',
                    backup: result.backup
                });
            } else {
                res.status(500).json({ success: false, error: result.error });
            }
            
        } catch (error) {
            console.error('Error creating backup:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    POSTCreateBackup
}; 