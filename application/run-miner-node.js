const { spawn } = require('child_process');
const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const path = require('path');

const runMinerNode = async (app, environement) => {
    const homeDirectory = await app.actions.getHomeDirectory.use();

    const rpcLAddr = environement.env['rpc.laddr'] ?? 'tcp://0.0.0.0:26657';
    const grpcAddress = environement.env['grpc.address'] ?? '0.0.0.0:9090';
    let jsonRpcAddress = environement.env['json-rpc.address'] ?? '0.0.0.0:8545';
    let jsonRpcWsAddress = environement.env['json-rpc.ws-address'] ?? '0.0.0.0:8546';
    const p2plAddr = environement.env['p2p.laddr'] ?? 'tcp://0.0.0.0:26656';

    let settings = {
        dumpCommitDebugExecutionTrace: true,
        nodeMode: "archive",
        logLevel: "info"
    };
    
    if (fs.existsSync(path.join(homeDirectory, 'settings.json'))) {
        const savedSettings = JSON.parse(fs.readFileSync(path.join(homeDirectory, 'settings.json'), 'utf8'));
        settings = { ...settings, ...savedSettings };
    }
    
    // Override RPC addresses with settings if available
    if (settings.rpcHttpPort) {
        jsonRpcAddress = `0.0.0.0:${settings.rpcHttpPort}`;
    }
    
    if (settings.rpcWsPort) {
        jsonRpcWsAddress = `0.0.0.0:${settings.rpcWsPort}`;
    }

    let appTomlPath = path.join(homeDirectory, 'config/app.toml');
    let appToml = fs.readFileSync(appTomlPath).toString();
    let configTomlPath = path.join(homeDirectory, 'config/config.toml');
    let configToml = fs.readFileSync(configTomlPath).toString();

    let pruningArgs = [];

    switch (settings.nodeMode) {
        case "extra-large": // 1 month
            configToml = configToml.replace(/indexer = \"null\"/gm, `indexer = \"kv\"`);
            appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
            pruningArgs = [
                `--pruning=custom`,
                `--pruning-keep-recent=181440`,
                `--pruning-interval=2000`,
                `--min-retain-blocks=181440`,
                `--skip-evidence-retention=true`,
                `--archive-mode=false`,
            ];
            break;
        case "large": // 1 week
            configToml = configToml.replace(/indexer = \"null\"/gm, `indexer = \"kv\"`);
            appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
            pruningArgs = [
                `--pruning=custom`,
                `--pruning-keep-recent=40320`,
                `--pruning-interval=1000`,
                `--min-retain-blocks=40320`,
                `--skip-evidence-retention=true`,
                `--archive-mode=false`,
            ];
            break;
        case "medium":
            configToml = configToml.replace(/indexer = \"null\"/gm, `indexer = \"kv\"`);
            appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
            pruningArgs = [
                `--pruning=custom`,
                `--pruning-keep-recent=10000`,
                `--pruning-interval=500`,
                `--min-retain-blocks=10000`,
                `--skip-evidence-retention=true`,
                `--archive-mode=false`,
            ];
            break;
        case "light":
            configToml = configToml.replace(/indexer = \"null\"/gm, `indexer = \"kv\"`);
            appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
            pruningArgs = [
                `--pruning=custom`,
                `--pruning-keep-recent=1000`,
                `--pruning-interval=500`,
                `--min-retain-blocks=1000`,
                `--skip-evidence-retention=true`,
                `--archive-mode=false`,
            ];
            break;
        case "very-light":
            configToml = configToml.replace(/indexer = \"kv\"/gm, `indexer = \"null\"`);
            appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
            pruningArgs = [
                `--pruning=custom`,
                `--pruning-keep-recent=10`,
                `--pruning-interval=500`,
                `--min-retain-blocks=10`,
                `--skip-evidence-retention=true`,
                `--archive-mode=false`,
            ];
            break;
        default: // archive
            configToml = configToml.replace(/indexer = \"null\"/gm, `indexer = \"kv\"`);
            appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
            pruningArgs = [
                `--pruning=nothing`,
                `--pruning-keep-recent=172800`, // 1 month
                `--pruning-interval=2000`,
                `--min-retain-blocks=172800`,
                `--archive-mode=true`
            ];
    }

    // switch (settings.nodeMode) {
    //     case "extra-large": // 1 month
    //         appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
    //         pruningArgs = [
    //             `--pruning=custom`,
    //             `--pruning-keep-recent=181440`,
    //             `--pruning-interval=10`,
    //             `--min-retain-blocks=181440`,
    //             `--skip-evidence-retention=true`,
    //             `--archive-mode=false`,
    //         ];
    //         break;
    //     case "large": // 1 week
    //         appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
    //         pruningArgs = [
    //             `--pruning=custom`,
    //             `--pruning-keep-recent=40320`,
    //             `--pruning-interval=10`,
    //             `--min-retain-blocks=40320`,
    //             `--skip-evidence-retention=true`,
    //             `--archive-mode=false`,
    //         ];
    //         break;
    //     case "medium":
    //         appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
    //         pruningArgs = [
    //             `--pruning=custom`,
    //             `--pruning-keep-recent=10000`,
    //             `--pruning-interval=10`,
    //             `--min-retain-blocks=10000`,
    //             `--skip-evidence-retention=true`,
    //             `--archive-mode=false`,
    //         ];
    //         break;
    //     case "light":
    //         appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
    //         pruningArgs = [
    //             `--pruning=custom`,
    //             `--pruning-keep-recent=1000`,
    //             `--pruning-interval=10`,
    //             `--min-retain-blocks=1000`,
    //             `--skip-evidence-retention=true`,
    //             `--archive-mode=false`,
    //         ];
    //         break;
    //     case "very-light":
    //         configToml = configToml.replace(/indexer = \"kv\"/gm, `indexer = \"null\"`);
    //         appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
    //         pruningArgs = [
    //             `--pruning=custom`,
    //             `--pruning-keep-recent=10`,
    //             `--pruning-interval=10`,
    //             `--min-retain-blocks=10`,
    //             `--skip-evidence-retention=true`,
    //             `--archive-mode=false`,
    //         ];
    //         break;
    //     default: // archive
    //         appToml = appToml.replace(/iavl-disable-fastnode = false/gm, `iavl-disable-fastnode = true`);
    //         pruningArgs = [
    //             `--pruning=custom`,
    //             `--pruning-keep-recent=172800`, // 1 month
    //             `--pruning-interval=10`,
    //             `--min-retain-blocks=172800`,
    //             `--archive-mode=true`
    //         ];
    // }

    // Apply RPC configuration from settings to app.toml
    if (settings.rateLimitRequestsPerSecond) {
        appToml = appToml.replace(
            /rate-limit-requests-per-second = \d+/gm,
            `rate-limit-requests-per-second = ${settings.rateLimitRequestsPerSecond}`
        );
        if (!appToml.includes('rate-limit-requests-per-second')) {
            // placer dans la section [json-rpc]
            appToml = appToml.replace(
                /\[json-rpc\]/gm,
                `[json-rpc]\nrate-limit-requests-per-second = ${settings.rateLimitRequestsPerSecond}`
            );
        }
    }
    
    if (settings.rateLimitWindow) {
        appToml = appToml.replace(
            /rate-limit-window = "[^"]*"/gm,
            `rate-limit-window = "${settings.rateLimitWindow}"`
        );
        if (!appToml.includes('rate-limit-window')) {
            // placer dans la section [json-rpc]
            appToml = appToml.replace(
                /\[json-rpc\]/gm,
                `[json-rpc]\nrate-limit-window = "${settings.rateLimitWindow}"`
            );
        }
    }
    
    if (settings.maxConcurrentConnections) {
        appToml = appToml.replace(
            /max-concurrent-connections = \d+/gm,
            `max-concurrent-connections = ${settings.maxConcurrentConnections}`
        );

        if (!appToml.includes('max-concurrent-connections')) {
            // placer dans la section [json-rpc]
            appToml = appToml.replace(
                /\[json-rpc\]/gm,
                `[json-rpc]\nmax-concurrent-connections = ${settings.maxConcurrentConnections}`
            );
        }
    }

    // Apply max-request-duration configuration from settings to app.toml
    if (settings.maxRequestDuration) {
        appToml = appToml.replace(
            /max-request-duration = "[^"]*"/gm,
            `max-request-duration = "${settings.maxRequestDuration}"`
        );

        if (!appToml.includes('max-request-duration')) {
            // placer dans la section [json-rpc]
            appToml = appToml.replace(
                /\[json-rpc\]/gm,
                `[json-rpc]\nmax-request-duration = "${settings.maxRequestDuration}"`
            );
        }
    }

    // Apply compute-time-window configuration from settings to app.toml
    if (settings.computeTimeWindow) {
        appToml = appToml.replace(
            /compute-time-window = "[^"]*"/gm,
            `compute-time-window = "${settings.computeTimeWindow}"`
        );

        if (!appToml.includes('compute-time-window')) {
            // placer dans la section [json-rpc]
            appToml = appToml.replace(
                /\[json-rpc\]/gm,
                `[json-rpc]\ncompute-time-window = "${settings.computeTimeWindow}"`
            );
        }
    }

    // Apply compute-time-limit-per-window-per-ip configuration from settings to app.toml
    if (settings.computeTimeLimitPerWindowPerIp) {
        appToml = appToml.replace(
            /compute-time-limit-per-window-per-ip = "[^"]*"/gm,
            `compute-time-limit-per-window-per-ip = "${settings.computeTimeLimitPerWindowPerIp}"`
        );

        if (!appToml.includes('compute-time-limit-per-window-per-ip')) {
            // placer dans la section [json-rpc]
            appToml = appToml.replace(
                /\[json-rpc\]/gm,
                `[json-rpc]\ncompute-time-limit-per-window-per-ip = "${settings.computeTimeLimitPerWindowPerIp}"`
            );
        }
    }

    // Apply gas-cap configuration from settings to app.toml
    if (settings.gasCap) {
        appToml = appToml.replace(
            /gas-cap = \d+/gm,
            `gas-cap = ${settings.gasCap}`
        );

        if (!appToml.includes('gas-cap')) {
            // placer dans la section [json-rpc]
            appToml = appToml.replace(
                /\[json-rpc\]/gm,
                `[json-rpc]\ngas-cap = ${settings.gasCap}`
            );
        }
    }

    // Apply evm-timeout configuration from settings to app.toml
    if (settings.evmTimeout) {
        appToml = appToml.replace(
            /evm-timeout = "[^"]*"/gm,
            `evm-timeout = "${settings.evmTimeout}"`
        );

        if (!appToml.includes('evm-timeout')) {
            // placer dans la section [json-rpc]
            appToml = appToml.replace(
                /\[json-rpc\]/gm,
                `[json-rpc]\nevm-timeout = "${settings.evmTimeout}"`
            );
        }
    }

    // Apply method-rate-limits configuration from settings to app.toml
    if (settings.methodRateLimits && Object.keys(settings.methodRateLimits).length > 0) {
        
        // Build new method-rate-limits configuration
        let methods = [];
        Object.entries(settings.methodRateLimits).forEach(([methodName, rateLimit]) => {
            if (rateLimit > 0) {
                methods.push(`${methodName}:${rateLimit}`);
            }
        });
        let methodRateLimitsConfig = `method-rate-limits = "${methods.join(',')}"`;

        // Replace the existing method-rate-limits section
        appToml = appToml.replace(/method-rate-limits = "[^"]*"/gm, methodRateLimitsConfig);
        
        // Add to [json-rpc] section
        if (!appToml.includes('method-rate-limits')) {
            appToml = appToml.replace(
                /\[json-rpc\]/gm,
                `[json-rpc]\n${methodRateLimitsConfig}`
            );
        }
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
            `--log_level=${settings.logLevel}`,
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
    app.node.stopOrdonned = false;

    childProcess.stdout.on('data', (data) => {
        const regex = new RegExp(`${String.fromCharCode(27)}\\[[0-9]{1,2}m`, 'gm');// remove termcaps
        app.node.logs.push(... data.toString().replace(regex, '').split('\n'));
        app.node.logs = app.node.logs.slice(-3000);

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

            if (app.node.startRetries == undefined || app.node.startRetries < 1000000) {
                app.node.startRetries = app.node.startRetries == undefined ? 0 : app.node.startRetries + 1;
                app.node.logs.push(`[RETRY] Number: ${app.node.startRetries} (wait 60 seconds)`);
                await new Promise((resolve) => setTimeout(resolve, 60000)); // wait 60 seconds before restarting the node
                app.node.logs.push(`[RETRY] Number: ${app.node.startRetries} Starting...`);
                if (!app.node.stopOrdonned) {
                    app.node.start();
                }
            }
        }
    });

    app.node.status = async () => {
        return childProcess.exitCode == undefined || (childProcess.exitCode != undefined && !app.node.stopOrdonned) ? '1' : '0';
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