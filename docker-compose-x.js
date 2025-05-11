const fs = require('fs');
const yaml = require('yaml');
const ethers = require('ethers');

const randomBetween = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getBuildType = (args) => {

    const isLocalRepositoriesMode = args.find(x => x == '--local-repositories') != undefined;

    if (isLocalRepositoriesMode) {
        return {
            context : '../',
            dockerfile: './Helios-Docker-Chain-Manager/Dockerfile-local-repositories',
        };
    }
    return '.';
}

const getImageType = (args) => {

    const isLocalRepositoriesMode = args.find(x => x == '--local-repositories') != undefined;

    if (isLocalRepositoriesMode) {
        return 'docker-helios-nodemanager';
    }
    return undefined;
}

const generateDockerCompose = (numNodes, walletsFile, args) => {
    const wallets = fs.readFileSync(walletsFile, 'utf-8')
        .trim()
        .split('\n')
        .map(line => line.split(' '));

    while (wallets.length < numNodes) {
        const wallet = ethers.Wallet.createRandom();
        wallets.push([wallet.address, wallet.privateKey.replace("0x", "")]);
    }

    while (wallets.length > numNodes) {
        wallets.pop();
    }

    let services = {};
    let baseIp = 2;

    for (let i = 0; i < numNodes; i++) {
        const [address, privateKey] = wallets[i];
        const nodeName = `node${i + 1}`;

        services[nodeName] = {
            build: getBuildType(args),
            image: getImageType(args),
            container_name: nodeName,
            ports: i < 3 ? [
                `${8080 + i}:8080`,
                `${8545 + (i * 3)}:8545`,
                `${(8545 + (i * 3)) + 1}:8546`,
                `${(8545 + (i * 3)) + 2}:8547`,
                `${1317 + i}:1317`,
                `${26657 + (i * 100)}:26657`,
                `${26656 + (i * 100)}:26656`,
                `${10337 + (i * 10)}:10337`,
                `${9090 + (i * 100)}:9090`
            ] : [],
            networks: {
                heliosnet: { ipv4_address: `192.168.1.${baseIp + i}` }
            },
            command: "npm run prod",
            environment: {
                PRIVATE_KEY: privateKey,
                ADDRESS: address,
                PASSWORD: "test",
                MANAGER_ACTIONS: JSON.stringify([
                    {
                        type: "setupToPeer",
                        timeout: 20000 * (1 + Math.floor((i - 1) / 40)),//randomBetween(10000, 100000),
                        walletPrivateKey: privateKey,
                        walletPassword: "test",
                        moniker: nodeName,
                        chainId: 42000,
                        peerIp: `192.168.1.2` // max_num_inbound_peers = 40 in nodes
                    },
                    { type: "createValidator", timeout: 50000 },
                    i < 5 ? { type: "delegate", timeout: 30000 + (i * 1000) } : undefined
                ].filter(x => x != undefined))
            },
            volumes: [
                `./data/${nodeName}/.heliades:/root/.heliades`
            ]
        };
    }

    services['node1'].environment.MANAGER_ACTIONS = JSON.stringify([
        {
            type: "setup",
            walletPrivateKey: wallets[0][1],
            walletPassword: "test",
            moniker: 'node1',
            chainId: 42000
        },
        {
            type: "multiTransfer",
            timeout: 20000,
            to: wallets.slice(1).map(w => w[0]),
            value: "500"
        },
        // { type: "startHyperion", timeout: 30000, walletPassword: "test" }
    ]);

    const dockerCompose = {
        version: '3.8',
        services,
        networks: {
            heliosnet: {
                driver: "bridge",
                ipam: { config: [{ subnet: "192.168.1.0/24" }] }
            }
        }
    };

    fs.writeFileSync(`docker-compose-${numNodes}-nodes.yml`, yaml.stringify(dockerCompose));
    console.log(`Fichier docker-compose-${numNodes}-nodes.yml généré avec succès.`);
};

// Utilisation : node docker-compose-x.js 50 wallets.txt
const args = process.argv.slice(2);
const numNodes = parseInt(args[0], 10);
const walletsFile = 'wallets.txt';

generateDockerCompose(numNodes, walletsFile, args);