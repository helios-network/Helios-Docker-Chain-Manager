const { exec } = require('child_process');

module.exports = {
    execWrapper: async (cmd) => {
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
             if (error) {
              console.warn(error);
             }
             resolve(stdout? stdout : stderr);
            });
        });
    },
    
    execWrapperWithRes: async (cmd) => {
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                const result = {
                    stdout: stdout || '',
                    stderr: stderr || '',
                    exitCode: error ? error.code : 0,
                    success: !error
                };
                resolve(result);
            });
        });
    }
};