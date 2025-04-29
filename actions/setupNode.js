const { generateJsonKeyStore } = require("../application/generate-json-keystore");
const { runMinerNode } = require("../application/run-miner-node");
const { setupNode } = require("../application/setup-node");

const action = async (app, environement, action) => {

    const isRequired = ['walletPassword', 'walletPrivateKey', 'moniker', 'chainId'].reduce((acc, key) => {
        if (action[key] == undefined) {
            console.log(`${key} is required`);
            return false;
        }
        return acc;
    }, true);

    if (!isRequired) {
        return false;
    }

    environement.walletPassword = action.walletPassword;
    environement.walletPrivateKey = action.walletPrivateKey;
    const keyStoreNode = await generateJsonKeyStore(action.walletPrivateKey, action.walletPassword);
    const nodeSetup = await setupNode(app, keyStoreNode, action.walletPassword, action.moniker, action.chainId, undefined, undefined);

    if (nodeSetup) {
        await runMinerNode(app, environement);
    }

    return true;
}

module.exports = {
    action
}