const { spawn } = require('child_process');
const fs = require('fs');

const runMinerNode = (app, environement) => {
    app.node = {
        status: '0',
        mining: '0',
        logs: [],
        checkIsAlive: async () => {},
        stop: async () => {}
    };
    app.post('/run-miner-node', async (req, res) => {
        let nodeAddress = (fs.readFileSync('./nodes/node/id').toString()).trim();

        const childProcess = spawn
        (
            'heliades',
            [
             'start',
             '--chain-id=4242',
             '--log_level="info"',
             '--rpc.laddr="tcp://0.0.0.0:26657"',
             '--minimum-gas-prices="0.1helios"',
             '--grpc.enable=true',
             '--grpc.address="0.0.0.0:9090"',
             '--grpc-web.enable=true',
             '--api.enable=true',
             '--api.enabled-unsafe-cors=true',
             '--json-rpc.enable=true',
             '--json-rpc.api="eth,txpool,personal,net,debug,web3"',
             '--json-rpc.address="0.0.0.0:8545"',
             '--json-rpc.ws-address="0.0.0.0:8546"',
             '--p2p.laddr="tcp://0.0.0.0:26656"'
            ],
            { stdio: ['pipe', 'pipe', 'pipe', 'pipe', fs.openSync('./nodes/node/.error.log', 'w')]}
        );
        app.node.process = childProcess;

        childProcess.stdout.on('data', (data) => {
            app.node.logs.push(... data.toString().split('\n'));
            app.node.logs = app.node.logs.slice(-1000);
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

        // app.node1.controller = controller;
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
        res.send('');
    });
};

module.exports = {
    runMinerNode
};