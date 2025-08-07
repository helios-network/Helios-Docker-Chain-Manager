const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const getRandomFileName = () => {
    return ("x".repeat(5)
             .replace(/./g, c => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62) ] ));
}

const runEthStats = (app, environement) => {
    app.ethStats = {
        status: '0',
        logs: [],
        checkIsAlive: async () => {},
        stop: async () => {}
    };
    app.post('/run-ethstats', async (req, res) => {

        const homeDirectory = await app.actions.getHomeDirectory.use();

        let ethStatsServerUrl = req.body['ethStatsServerUrl'];
        let ethStatsNodeName = req.body['ethStatsNodeName'];

        app.ethStats.serverUrl = ethStatsServerUrl;
        app.ethStats.nodeName = ethStatsNodeName;

        if (app.ethStats.nodeName == undefined || app.ethStats.nodeName.trim() == '') {
            app.ethStats.nodeName = 'Helios_Docker_Node_' + getRandomFileName();
        }

        let resolved = false;

        const childProcess = spawn
        (
            'node',
            [
             'ethstats-cli/run.mjs',
             '--register',
             '--account-email=info@helioschain.network',
             `--node-name=${app.ethStats.nodeName}`,
             `--server-url=${app.ethStats.serverUrl}`,
             '--client-url=http://127.0.0.1:8545'
            ],
            { stdio: ['pipe', 'pipe', 'pipe', 'pipe', fs.openSync(path.join(homeDirectory, '.error-ethstats.log'), 'w')]}
        );
        app.ethStats.process = childProcess;

        childProcess.stdout.on('data', (data) => {
            console.log(data.toString());
            app.ethStats.logs.push(... data.toString().split('\n'));
            app.ethStats.logs = app.ethStats.logs.slice(-1000);

            if (resolved == false) {
                resolved = true;
                res.send(true);
            }
        });
        childProcess.stderr.on('data', (data) => {
            console.log(data.toString());
            app.ethStats.logs.push(... data.toString().split('\n'));
            app.ethStats.logs = app.ethStats.logs.slice(-1000);

            if (resolved == false) {
                resolved = true;
                res.send(false);
            }
        });

        childProcess.on('error', (error) => {
            console.log(`[STACKTRACE] ${error.stack}`);
            app.ethStats.logs.push(`${error.name}: ${error.message}`);
            app.ethStats.logs.push(`[STACKTRACE] ${error.stack}`);

            if (resolved == false) {
                resolved = true;
                res.send(false);
            }
        });

        childProcess.on('exit', (code, signal) => {
            console.log(`[EXIT] ${code}`);
            app.ethStats.logs.push(`[EXIT] ${code}`);

            if (resolved == false) {
                resolved = true;
                res.send(false);
            }
        });
        app.ethStats.checkIsAlive = async () => {
            app.ethStats.status = childProcess.exitCode == undefined ? '1' : '0';
        };
        app.ethStats.stop = () => {
            childProcess.kill('SIGTERM');
        }
    });
};

module.exports = {
    runEthStats
};