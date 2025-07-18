import Configstore from 'configstore';
import fs from 'fs';

const cleaner = new Configstore('ethstats-cli');
cleaner.clear();
const configStore = new Configstore('ethstats-cli', {
	"configurator": {
		"url": "http://localhost:3000"
	},
	"client": {
		"url": "http://localhost:8545"
	},
	"server": {
		"url": "http://localhost:3000"
	},
	"nodeName": "GraphLinq_Chain_Node_Official_In_Docker_Manager",
	"secretKey": "38e9550898d87a4bbeda65995424dfa967d81d47",
	"firstRun": true
});

// configStore.clear();

console.log(configStore.path);

const config = {
  configStore: configStore,
  configurator: {
    url: 'https://config.ethstats.io:443'
  },
  server: {
    net: 'mainnet'
  },
  client: {
    url: 'http://localhost:8545'
  },
  logger: {
    showErrors: true,
    showInfos: false,
    showDebugs: false
  }
};

export default config;