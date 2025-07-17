const fs = require('fs');
const path = require('path');
const { execWrapper } = require('../utils/exec-wrapper');
const crypto = require('crypto');

const initAppNodeFunctions = async (app, environement) => {

    const homeDirectory = await app.actions.getHomeDirectory.use();

    app.node.getInfos = async () => {
        let status = { result: undefined };
        try {
            const response = await fetch('http://localhost:26657/status');
            status = await response.json();
        } catch (e) {}

        try {
            let infos = {
                ... status.result,
                heliosAddress: await app.node.getHeliosAddress(),
                heliosValAddress: await app.node.getHeliosValAddress(),
                address: await app.node.getAddress(),
                metadata: await app.node.getMetadata(),
                peers: await app.node.getPeers(),
                persistentPeers: await app.node.getPersistentPeers(),
                mode: await app.node.getMode(),
            }

            if (infos.node_info?.id == undefined) {
                if (infos.node_info == undefined) {
                    infos.node_info = {};
                }
                infos.node_info.id = await app.node.getNodeId();
                infos.node_info.listen_addr = environement.env['p2p.laddr'] ?? 'tcp://0.0.0.0:26656';
            }

            return infos;
        } catch (e) {
            console.log(e);
            return {};
        }
    }

    app.node.getMetadata = async () => {
        if (fs.existsSync(path.join(homeDirectory, 'data/metadata.json'))) {
            const data = fs.readFileSync(path.join(homeDirectory, 'data/metadata.json'));
            return JSON.parse(data);
        }
        // empty metadata
        return {
            "chain_id":"42000",
            "height": "0",
            "hash": "",
            "time": (new Date()).toISOString(),
            "proposer":"",
            "validators":[]
        };
    }

    app.node.getHeliosAddress = async () => {
        if (app.node.heliosAddress == undefined) {
            const data = await execWrapper(`heliades keys show user0 -a --bech=acc --keyring-backend="local"`);
            if (data.trim().includes("Error")) {
                return undefined;
            }
            app.node.heliosAddress = data.trim();
        }
        return app.node.heliosAddress;
    }

    app.node.getHeliosValAddress = async () => {
        if (app.node.heliosValAddress == undefined) {
            const data = await execWrapper(`heliades keys show user0 -a --bech=val --keyring-backend="local"`);
            if (data.trim().includes("Error")) {
                return undefined;
            }
            app.node.heliosValAddress = data.trim();
        }
        return app.node.heliosValAddress;
    }

    app.node.getAddress = async () => {
        if (app.node.address == undefined) {
            const data = await execWrapper(`heliades keys show user0 -e --keyring-backend="local"`);
            if (data.trim().includes("Error")) {
                return "0x0000000000000000000000000000000000000000";
            }
            app.node.address = data.trim();
        }
        return app.node.address;
    }

    app.node.getPeers = async () => {
        if (fs.existsSync(path.join(homeDirectory, 'config/addrbook.json'))) {
            const data = fs.readFileSync(path.join(homeDirectory, 'config/addrbook.json'));
            const json = JSON.parse(data);

            const peers = json.addrs.map(x => {
                if (x.src.ip == "0.0.0.0") {
                    return `${x.addr.id}@${x.addr.ip}:${x.addr.port}`;
                } else {
                    return `${x.src.id}@${x.src.ip}:${x.src.port}`;
                }
            });
            return peers;
        }
        return [];
    }

    app.node.getPersistentPeers = async () => {
        if (fs.existsSync(path.join(homeDirectory, 'config/config.toml'))) {
            const data = fs.readFileSync(path.join(homeDirectory, 'config/config.toml')).toString();
            const match = (new RegExp(`persistent_peers \= "(.*)"`, 'gm')).exec(data);
            if (match) {
                return match[1].split(',').map(x => x.trim());
            }
        }
        return [];
    }

    app.node.getMode = async () => {
        if (fs.existsSync(path.join(homeDirectory, 'settings.json'))) {
            return JSON.parse(fs.readFileSync(path.join(homeDirectory, 'settings.json'))).nodeMode;
        }
        return "archive";
    }

    app.node.setPersistentPeers = async (peers) => {
        console.log(peers);
        const data = fs.readFileSync(path.join(homeDirectory, 'config/config.toml')).toString();
        const newData = data.replace(new RegExp(`persistent_peers \= "(.*)"`, 'gm'), `persistent_peers = "${peers.join(',')}"`);
        fs.writeFileSync(path.join(homeDirectory, 'config/config.toml'), newData);
    }

    app.node.addPeer = async (peerAddress) => {
        if (!peerAddress.match(/^[a-zA-Z0-9]+@[a-zA-Z0-9.]+:[0-9]+$/)) {
            return false;
        }
        const peers = await app.node.getPersistentPeers();
        if (!peers.includes(peerAddress)) {
            await app.node.setPersistentPeers([...peers, peerAddress]);
        }
        return true;
    }

    app.node.getNodeId = async () => {
        try {
            const nodeKeyPath = path.join(homeDirectory, 'config/node_key.json');
            // Charger node_key.json
            const nodeKey = JSON.parse(fs.readFileSync(nodeKeyPath, 'utf-8'));

            // Extraire la clé privée base64
            const privKeyBase64 = nodeKey.priv_key.value;
            const privKeyBytes = Buffer.from(privKeyBase64, 'base64');

            // Vérifier que c'est bien une clé Ed25519
            if (nodeKey.priv_key.type !== 'tendermint/PrivKeyEd25519' || privKeyBytes.length !== 64) {
                throw new Error('Clé non reconnue ou invalide');
            }

            // En Ed25519, la clé publique est dans les 32 derniers octets de la clé privée étendue
            const pubKey = privKeyBytes.slice(32);

            // Le node_id est l'adresse = SHA256(pubkey) -> premiers 20 bytes -> hex
            const sha256 = crypto.createHash('sha256').update(pubKey).digest();
            const nodeId = sha256.slice(0, 20).toString('hex');

            console.log(nodeId);
            
            return nodeId;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

}

module.exports = {
    initAppNodeFunctions
}