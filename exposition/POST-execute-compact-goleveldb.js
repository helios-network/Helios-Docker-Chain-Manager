const { execWrapper } = require('../utils/exec-wrapper');

const POSTExecuteCompactGoLevelDb = (app, environement) => {
    app.post('/execute-compact-goleveldb', async (req, res) => {
        try {
            // Authentication check
            const accessCode = req.headers['access-code'];
            if (!accessCode) {
                return res.status(401).json({ success: false, error: 'Access code required.' });
            }

            // Execute the heliades experimental-compact-goleveldb command
            const command = 'heliades experimental-compact-goleveldb';
            const output = await execWrapper(command);

            res.json({ 
                success: true, 
                output: output,
                message: 'Experimental GoLevelDB compacted successfully'
            });
            
        } catch (error) {
            console.error('Error executing compact goleveldb command:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message || 'Failed to execute compact goleveldb command'
            });
        }
    });
};

module.exports = {
    POSTExecuteCompactGoLevelDb
}; 