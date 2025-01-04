const { spawn } = require('child_process');
const fs = require('fs');

const runMinerNode = async (app, environement) => {
    if (!fs.existsSync('./node')) {
        fs.mkdirSync('./node');
    }

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
            '--chain-id=4242',
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
        { stdio: ['pipe', 'pipe', 'pipe', 'pipe', fs.openSync('./node/.error.log', 'w')]}
    );
    app.node.process = childProcess;

    childProcess.stdout.on('data', (data) => {
        const regex = new RegExp(`${String.fromCharCode(27)}\\[[0-9]{1,2}m`, 'gm');// remove termcaps
        app.node.logs.push(... data.toString().replace(regex, '').split('\n'));
        app.node.logs = app.node.logs.slice(-1000);

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

    childProcess.on('exit', (code, signal) => {
        app.node.logs.push(`[EXIT] ${code}`);
    });

    app.node.checkIsAlive = async () => {
        app.node.status = childProcess.exitCode == undefined ? '1' : '0';
        if (app.node.status == '1') {
            // todo check if is mining
        }
        app.node.mining = '0';
    };

    app.node.stop = () => {
        childProcess.kill('SIGTERM');
    }
};

module.exports = {
    runMinerNode
};