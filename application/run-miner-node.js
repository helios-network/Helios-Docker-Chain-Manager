const { spawn } = require('child_process');
const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const path = require('path');

const runMinerNode = async (app, environement) => {
    const homeDirectory = await app.actions.getHomeDirectory.use();

    const rpcLAddr = environement.env['rpc.laddr'] ?? 'tcp://0.0.0.0:26657';
    const grpcAddress = environement.env['grpc.address'] ?? '0.0.0.0:9090';
    const jsonRpcAddress = environement.env['json-rpc.address'] ?? '0.0.0.0:8545';
    const jsonRpcWsAddress = environement.env['json-rpc.ws-address'] ?? '0.0.0.0:8546';
    const p2plAddr = environement.env['p2p.laddr'] ?? 'tcp://0.0.0.0:26656';

    const childProcess = spawn
    (
        'heliades',
        [
            'start',
            '--chain-id=42000',
            '--log_level=info',
            `--rpc.laddr=${rpcLAddr}`,
            '--minimum-gas-prices=0.1helios',
            '--grpc.enable=true',
            `--grpc.address=${grpcAddress}`,
            '--grpc-web.enable=true',
            '--api.enable=true',
            '--api.enabled-unsafe-cors=true',
            '--json-rpc.enable=true',
            '--json-rpc.api=eth,txpool,personal,net,debug,web3',
            `--json-rpc.address=${jsonRpcAddress}`,
            `--json-rpc.ws-address=${jsonRpcWsAddress}`,
            `--p2p.laddr=${p2plAddr}`
        ],
        { stdio: ['pipe', 'pipe', 'pipe', 'pipe', fs.openSync(path.join(homeDirectory, '.error-node.log'), 'w')]}
    );
    app.node.process = childProcess;

    childProcess.stdout.on('data', (data) => {
        const regex = new RegExp(`${String.fromCharCode(27)}\\[[0-9]{1,2}m`, 'gm');// remove termcaps
        app.node.logs.push(... data.toString().replace(regex, '').split('\n'));
        app.node.logs = app.node.logs.slice(-1000);

        app.node.lastLogTime = Date.now();
        if (environement.env['helios-logs'] === 'enabled') {
            console.log(data);
        }
    });
    childProcess.stderr.on('data', (data) => {
        app.node.logs.push(... data.toString().split('\n'));
        app.node.logs = app.node.logs.slice(-1000);
    });

    childProcess.on('error', (error) => {
        app.node.logs.push(`${error.name}: ${error.message}`);
        app.node.logs.push(`[STACKTRACE] ${error.stack}`);
    });

    childProcess.on('exit', async (code, signal) => {
        app.node.logs.push(`[EXIT] ${code}`);
        if (!app.node.stopOrdonned) {

            if (app.node.startRetries == undefined || app.node.startRetries < 3) {
                app.node.startRetries = app.node.startRetries == undefined ? 0 : app.node.startRetries + 1;
                app.node.logs.push(`[RETRY] ${app.node.startRetries} / 3 (wait ${10000 * app.node.startRetries}ms)`);
                await new Promise((resolve) => setTimeout(resolve, 10000 * app.node.startRetries)); // wait 10 seconds before restarting the node
                app.node.logs.push(`[RETRY] ${app.node.startRetries} / 3 Starting...`);
                app.node.start();
            } else {
                app.node.logs.push(`[RETRY] FAILED (restarted ${app.node.startRetries} times)`);
                app.node.startRetries = 0;
                app.node.stopOrdonned = false;
                setTimeout(() => {
                    app.node.start();
                }, 1000 * 60); // 1 minute
            }
        } else {
            app.node.stopOrdonned = false;
        }
    });

    app.node.status = async () => {
        return childProcess.exitCode == undefined ? '1' : '0';
    }

    app.node.stop = async () => {
        app.node.stopOrdonned = true;
        childProcess.kill('SIGTERM');
    }

    app.node.start = async () => {
        await runMinerNode(app, environement);
    }
};

module.exports = {
    runMinerNode
};