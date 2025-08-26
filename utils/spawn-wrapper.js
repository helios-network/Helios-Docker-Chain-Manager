const { spawn } = require("child_process");

module.exports = {
    spawnWrapper: async (cmd, args) => {
        return new Promise((resolve, reject) => {

            const child = spawn(cmd, args);

            child.stdout.on("data", (data) => {});

            child.stderr.on("data", (data) => {});

            child.on("exit", (code) => {
                resolve(code);
            });
        });
    }
};