const fs = require('fs');
const yaml = require('yaml');
const ethers = require('ethers');

const randomBetween = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateDockerCompose = (numNodes, walletsFile) => {
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
            build: '.',
            container_name: nodeName,
            ports: [
                `${8080 + i}:8080`,
                `${8545 + i}:8545`,
                `${1317 + i}:1317`,
                `${26657 + (i * 100)}:26657`,
                `${26656 + (i * 100)}:26656`,
                `${10337 + (i * 10)}:10337`,
                `${9090 + (i * 100)}:9090`
            ],
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
                        timeout: randomBetween(10000, 50000),
                        walletPrivateKey: privateKey,
                        walletPassword: "test",
                        moniker: nodeName,
                        chainId: 4242,
                        peerIp: "192.168.1.2"
                    },
                    { type: "createValidator", timeout: randomBetween(20000, 50000) }
                ])
            }
        };
    }

    services['node1'].environment.MANAGER_ACTIONS = JSON.stringify([
        {
            type: "setup",
            walletPrivateKey: wallets[0][1],
            walletPassword: "test",
            moniker: 'node1',
            chainId: 4242
        },
        {
            type: "multiTransfer",
            timeout: 10000,
            to: wallets.slice(1).map(w => w[0]),
            value: "500"
        }
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
const walletsFile = args[1] || 'wallets.txt';

generateDockerCompose(numNodes, walletsFile);