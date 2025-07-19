const { execWrapperWithRes } = require('../utils/exec-wrapper');

const POSTExecuteRollback = (app, environement) => {
    app.post('/execute-rollback', async (req, res) => {
        try {
            // Execute the rollback command
            const command = 'heliades rollback --hard --delete-latest-state';
            
            console.log('Executing rollback command:', command);
            
            const result = await execWrapperWithRes(command);
            
            let output = '';
            if (result.stdout) {
                output += result.stdout;
            }
            if (result.stderr) {
                output += result.stderr;
            }
            
            if (result.success) {
                console.log('Rollback command executed successfully');
                res.json({ 
                    success: true, 
                    message: 'Rollback executed successfully',
                    output: output
                });
            } else {
                console.error('Rollback command failed with exit code:', result.exitCode);
                res.status(500).json({ 
                    success: false, 
                    error: 'Rollback command failed',
                    output: output,
                    exitCode: result.exitCode
                });
            }
            
        } catch (error) {
            console.error('Error executing rollback command:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });
};

module.exports = {
    POSTExecuteRollback
}; 