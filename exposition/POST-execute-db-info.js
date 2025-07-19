const { execWrapperWithRes } = require('../utils/exec-wrapper');

const POSTExecuteDbInfo = (app, environement) => {
    app.post('/execute-db-info', async (req, res) => {
        try {
            const { height } = req.body;
            
            // Build the command with the specified height or 'latest'
            const blockHeight = height && height !== 'latest' ? height : 'latest';
            const command = `heliades application-db info --height=${blockHeight}`;
            
            console.log('Executing DB info command:', command);
            
            const result = await execWrapperWithRes(command);
            
            let output = '';
            if (result.stdout) {
                output += result.stdout;
            }
            if (result.stderr) {
                output += result.stderr;
            }
            
            if (result.success) {
                console.log('DB info command executed successfully');
                res.json({ 
                    success: true, 
                    message: 'DB info retrieved successfully',
                    output: output,
                    height: blockHeight
                });
            } else {
                console.error('DB info command failed with exit code:', result.exitCode);
                res.status(500).json({ 
                    success: false, 
                    error: 'DB info command failed',
                    output: output,
                    exitCode: result.exitCode,
                    height: blockHeight
                });
            }
            
        } catch (error) {
            console.error('Error executing DB info command:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });
};

module.exports = {
    POSTExecuteDbInfo
}; 