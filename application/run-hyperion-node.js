const { spawn } = require('child_process');
const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const { keyStoreRecover } = require('../utils/key-store');
const { getAddress } = require('ethers');
const path = require('path');

const runHyperionNode = async (app, environement, password) => {
    const homeDirectory = await app.actions.getHomeDirectory.use();

    const keyStoreNode = fs.readFileSync(path.join(homeDirectory, 'keystore')).toString();
    const privateKey = await keyStoreRecover(keyStoreNode, password);
    if (privateKey == undefined) {
        return;
    }
    const address = getAddress('0x'+JSON.parse(keyStoreNode).address);

    const heliosGrpc = 'tcp://127.0.0.1:9090';
    const tendermintRpc = 'http://127.0.0.1:26657';

    const childProcess = spawn
    (
        'hyperion',
        [
            '--env=local',
            '--log-level=info',
            '--svc-wait-timeout=1m',

            'server', // run server command

            `--helios-chain-id=42000`,
            `--helios-grpc=${heliosGrpc}`,
            `--tendermint-rpc=${tendermintRpc}`,
            `--helios-gas-prices=3000000000ahelios`,
            `--helios-gas=3000000`,
            `--helios-pk=${privateKey}`,
            `--eth-gas-price-adjustment=1.3`,
            `--eth-max-gas-price=500gwei`,
            `--relay-pending-tx-wait-duration=20m`
        ],
        { stdio: ['pipe', 'pipe', 'pipe', 'pipe', fs.openSync(path.join(homeDirectory, '.error-hyperion.log'), 'w')]}
    );
    app.hyperion.process = childProcess;

    childProcess.stdout.on('data', (data) => {
        const regex = new RegExp(`${String.fromCharCode(27)}\\[[0-9]{1,2}m`, 'gm');// remove termcaps
        app.hyperion.logs.push(... data.toString().replace(regex, '').split('\n'));
        app.hyperion.logs = app.hyperion.logs.slice(-10000);

        if (environement.env['helios-logs'] === 'enabled') {
            console.log(data);
        }
    });
    childProcess.stderr.on('data', (data) => {
        app.hyperion.logs.push(... data.toString().split('\n'));
        app.hyperion.logs = app.hyperion.logs.slice(-10000);
    });

    childProcess.on('error', (error) => {
        app.hyperion.logs.push(`${error.name}: ${error.message}`);
        app.hyperion.logs.push(`[STACKTRACE] ${error.stack}`);
    });

    childProcess.on('exit', (code, signal) => {
        app.hyperion.logs.push(`[EXIT] ${code}`);
    });

    app.hyperion.status = async () => {
        return childProcess.exitCode == undefined ? '1' : '0';
    }

    app.hyperion.getAddress = async () => {
        return address;
    }

    app.hyperion.stop = async () => {
        childProcess.kill('SIGTERM');
    }

    app.hyperion.start = async () => {
        await runHyperionNode(app, environement, password);
    }

    console.log('hyperion started');
};

module.exports = {
    runHyperionNode
};