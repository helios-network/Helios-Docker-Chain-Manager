const { runMinerNode } = require('../application/run-miner-node');

const runMinerNodeRoute = (app, environement) => {
    app.post('/run-miner-node', async (req, res) => {

        const status = await app.node.status();
        if (status == '0') {
            await runMinerNode(app, environement);
        }
        res.send(status == '0' ? false : true);
    });
};

module.exports = {
    runMinerNodeRoute
};