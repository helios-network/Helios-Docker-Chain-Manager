const { execWrapper } = require('../utils/exec-wrapper');

const POSTExecuteCompactApplicationDb = (app, environement) => {
    app.post('/execute-compact-application-db', async (req, res) => {
        try {
            // Authentication check
            const accessCode = req.headers['access-code'];
            if (!accessCode) {
                return res.status(401).json({ success: false, error: 'Access code required.' });
            }

            // Execute the heliades application-db compact command
            const command = 'heliades application-db compact';
            const output = await execWrapper(command);

            res.json({ 
                success: true, 
                output: output,
                message: 'Application database compacted successfully'
            });
            
        } catch (error) {
            console.error('Error executing compact application-db command:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message || 'Failed to execute compact application-db command'
            });
        }
    });
};

module.exports = {
    POSTExecuteCompactApplicationDb
}; 