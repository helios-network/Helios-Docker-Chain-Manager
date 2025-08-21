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

    let settings = {
        dumpCommitDebugExecutionTrace: true,
        nodeMode: "archive"
    };
    
    if (fs.existsSync(path.join(homeDirectory, 'settings.json'))) {
        const savedSettings = JSON.parse(fs.readFileSync(path.join(homeDirectory, 'settings.json'), 'utf8'));
        settings = { ...settings, ...savedSettings };
    }

    let appTomlPath = path.join(homeDirectory, 'config/app.toml');
    let appToml = fs.readFileSync(appTomlPath).toString();
    let configTomlPath = path.join(homeDirectory, 'config/config.toml');
    let configToml = fs.readFileSync(configTomlPath).toString();

    let pruningArgs = [];

    switch (settings.nodeMode) {
        case "medium":
            pruningArgs = [
                `--pruning=custom`,
                `--pruning-keep-recent=10000`,
                `--pruning-interval=10`,
                `--min-retain-blocks=10000`,
                `--skip-evidence-retention=true`,
                `--archive-mode=false`,
            ];
            break;
        case "light":
            pruningArgs = [
                `--pruning=custom`,
                `--pruning-keep-recent=1000`,
                `--pruning-interval=10`,
                `--min-retain-blocks=1000`,
                `--skip-evidence-retention=true`,
                `--archive-mode=false`,
            ];
            break;
        case "very-light":
            configToml = configToml.replace(/indexer = \"kv\"/gm, `indexer = \"null\"`);
            pruningArgs = [
                `--pruning=custom`,
                `--pruning-keep-recent=10`,
                `--pruning-interval=10`,
                `--min-retain-blocks=10`,
                `--skip-evidence-retention=true`,
                `--archive-mode=false`,
            ];
            break;
        default: // archive
            pruningArgs = [
                `--pruning=custom`,
                `--pruning-keep-recent=172800`, // 1 month
                `--pruning-interval=10`,
                `--min-retain-blocks=172800`,
                `--archive-mode=true`
            ];
    }

    // write app.toml and config.toml
    fs.writeFileSync(configTomlPath, configToml);
    fs.writeFileSync(appTomlPath, appToml);

    // backup flags if enabled and node mode is very-light
    let backupArgs = [];
    
    if (settings.backupEnable && settings.nodeMode === "very-light") {
        backupArgs = [
            `--backup.enable=true`,
            `--backup.block-interval=${settings.backupBlockInterval ?? 100}`,
            `--backup.dir=${settings.backupDir ?? "./backups"}`,
            `--backup.min-retain-backups=${settings.backupMinRetainBackups ?? 3}`,
        ];

        console.log('Backup enabled for very-light mode:', backupArgs);
    } else if (settings.backupEnable && settings.nodeMode !== "very-light") {
        console.log('Backup disabled: only available in very-light mode. Current mode:', settings.nodeMode);
    }

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
            `--p2p.laddr=${p2plAddr}`,

            `--state-sync.snapshot-interval=0`, // disable state sync snapshot (piece of shit)
            `--state-sync.snapshot-keep-recent=0`, // disable state sync snapshot (piece of shit)

            ...(settings.dumpCommitDebugExecutionTrace ? [`--dump-commit-debug-execution-trace=true`] : []),
            
            // pruning
            ...pruningArgs,

            ...backupArgs,
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