const { generateJsonKeyStore } = require("../application/generate-json-keystore");
const fs = require('fs');
const { setupNode } = require("../application/setup-node");
const { runMinerNode } = require("../application/run-miner-node");

const actionSetup = async (app, environement, action) => {
    const keyStoreNode = await generateJsonKeyStore(action.walletPrivateKey, action.walletPassword);
    const nodeSetup = await setupNode(keyStoreNode, action.walletPassword, action.moniker, action.chainId, action.genesisURL, action.peerInfos);

    if (nodeSetup) {
        await runMinerNode(app, environement);
    }
}

module.exports = {
    runAutomation: async (app, environement) => {
        
        console.log('[Helios Node - API] - RUN Automation');

        // setup app password
        if (environement.env.PASSWORD != undefined && !fs.existsSync('./.password')) {
            environement.password = environement.env.PASSWORD;
            fs.writeFileSync('./.password', environement.password);
        }

        // have actions
        if (environement.env.MANAGER_ACTIONS == undefined) {
            return ;
        }

        // find actions
        const actions = JSON.parse(environement.env.MANAGER_ACTIONS);
        for (let action of actions) {
            switch (action.type) {
                case "setup":
                    await actionSetup(app, environement, action)
                    break ;
                default:
                    console.log(`action ${action.type} not managed`)
                    break;
            }
        }
    }
};