const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const keyth = require('keythereum');
const { fileGetContent } = require('../utils/file-get-content');
const path = require('path');
const os = require('os');
const { setupNode } = require('../application/setup-node');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const decrypt2 = async (json, password) => {
    const keyobj = JSON.parse(json);
    const privateKey = keyth.recover(password,keyobj);
    return privateKey.toString('hex');
}

const postSetupNode = (app, environement) => {
    app.post('/setup-node', async (req, res) => {
        try {
            const keyStoreNode = req.body['keyStoreNode'];
            const passwordCrypted = req.body['password'];

            const genesisURL = req.body['genesisURL'] == "" ? undefined : req.body['genesisURL'];
            const moniker = req.body['moniker'];
            const chainId = req.body['chainId'];

            const nodeIP = req.body['nodeIP'];
            const nodeId = req.body['nodeId'];
            const nodeGRPCPort = req.body['nodeGRPCPort'];
            const nodeRPCPort = req.body['nodeRPCPort'];
            const nodeP2PPort = req.body['nodeP2PPort'];
            const mode = req.body['mode'] == undefined ? "archive" : req.body['mode'];

            let genesisContent = undefined;
            if (nodeIP != undefined && nodeIP != '') {
                genesisContent = (await fileGetContent(genesisURL)).toString();
            }

            await setupNode(app, keyStoreNode, unrot13(atob(passwordCrypted)), moniker, chainId, genesisURL, {
                nodeIP: nodeIP,
                nodeId: nodeId,
                nodeGRPCPort: nodeGRPCPort,
                nodeRPCPort: nodeRPCPort,
                nodeP2PPort: nodeP2PPort
            }, mode);

            app.node.setup = true;

            res.send({ status: 'ready' });

        } catch (e) {
            res.send({ status: 'ko' });
            console.log(e);
        }
    });
};

module.exports = {
    postSetupNode
};