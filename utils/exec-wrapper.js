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
    }
};