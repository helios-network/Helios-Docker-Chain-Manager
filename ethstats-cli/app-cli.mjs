// import pkg from '../package.json';

import meow from 'meow';
import chalk from 'chalk';
import boxen from 'boxen';
import lodash from 'lodash';
import inquirer from 'inquirer';
import nodeCleanup from 'node-cleanup';
// import updateNotifier from 'update-notifier';
import findProcess from 'find-process';
import systemInfo from 'systeminformation';

import config from './Config.mjs';
import Configurator from './Configurator.mjs';
import Logger from './Logger.mjs';
import CLI from './Cli.mjs';
import Register from './Register.mjs';
import Server from './Server.mjs';

// updateNotifier({pkg}).notify();

const runEthStats = (configArgs = { cmd: true }, propertiesAttachedVar = {}) => {
  const diContainer = {
    inquirer: inquirer,
    config: config,
    // pkg: pkg,
    meow: meow,
    chalk: chalk,
    boxen: boxen,
    lodash: lodash,
    systemInfo: systemInfo
  };

  const log = new Logger(config.logger);
  diContainer.logger = log;

  let cli = undefined;

  if (configArgs.cmd === true) {
    cli = new CLI(diContainer);
  } else {
    cli = {
      flags: {
        verbose: true,
        debug: true,
        configuratorUrl: 'http://localhost:3000',
        clientUrl: 'http://127.0.0.1:8545',
        clientIpcPath: '',
        serverUrl: 'http://127.0.0.1:3000',
        net: 'mainnet',
        register: true,
        accountEmail: 'info@graphlinq.io',
        nodeName: 'GraphLinq_Chain_Node_Official_In_Docker_Manager',
        ... configArgs
      }
    };
  }
  diContainer.cli = cli;

  const configurator = new Configurator(diContainer);
  diContainer.configurator = configurator;

  let server = new Server(diContainer);
  diContainer.server = server;

  const register = new Register(diContainer);
  diContainer.register = register;

  const initApp = () => {
    if (config.configStore.get('firstRun') !== false) {
      log.echo('First run detected. Please follow instructions to register your node.');
    }

    let isServerFromConfigFile = !cli.flags.net && config.configStore.has('server') && config.configStore.get('server').url;

    if (isServerFromConfigFile || cli.flags.serverUrl) {
      server.create();
      server.socket.on('open', () => {
        propertiesAttachedVar.serverOppened = true;
        if (config.configStore.get('firstRun') !== false) {
          if (cli.flags.register) {
            server.registerNode(cli.flags.accountEmail, cli.flags.nodeName);
          } else {
            register.askInstallationType(false);
          }
        }
      });
    } else {
      log.info('Get server connections');
      configurator.get({
        configName: 'serverUrl'
      }).then(configValue => {
        if (configValue === null) {
          log.error('Could not get server connections', false, true);
        } else {
          diContainer.config.serverUrls = configValue;

          if (config.configStore.get('firstRun') === false) {
            server.create();
          } else if (!cli.flags.net && !cli.flags.register) {
            register.askInstallationType(true);
          } else {
            server.create();
            server.socket.on('open', () => {
              if (config.configStore.get('firstRun') !== false) {
                if (cli.flags.register) {
                  server.registerNode(cli.flags.accountEmail, cli.flags.nodeName);
                } else {
                  register.askInstallationType(false);
                }
              }
            });
          }
        }
      });
    }

    const destroyServer = () => {
      log.info('Reinitializing app...');

      server.client.stop(true);
      server.destroy();
      propertiesAttachedVar.serverOppened = false;
    }

    const restartServer = () => {
      log.info('Reinitializing app...');

      server.client.stop(true);
      server.destroy();

      server = new Server(diContainer);
      diContainer.server = server;

      propertiesAttachedVar.serverOppened = false;

      initApp();
    };

    propertiesAttachedVar.destroyServer = destroyServer;
    propertiesAttachedVar.restartServer = restartServer;

    server.eventEmitter.on('destroy', restartServer);
  };

  findProcess('name', 'ethstats-cli').then(list => {
    log.debug(`Process list: ${JSON.stringify(list)}`);

    let processList = [];

    list.forEach(proc => {
      if (proc.name === 'ethstats-cli') {
        processList.push(proc);
      }
    });

    if (processList.length > 1) {
      log.error('Ethstats-CLI is already running', false, true);
    } else {
      initApp();
    }
  });

  nodeCleanup((exitCode, signal) => {
    console.log('Cleaning up...', exitCode, signal);
    if (server && server.socket){// && propertiesAttachedVar.destroyServer) {
      // propertiesAttachedVar.destroyServer();
      server.logout();
      server.destroy();
      propertiesAttachedVar.serverOppened = false;
    }

    log.info(`Exited with code: ${exitCode}, signal: ${signal}`);
  });
}

export default runEthStats;