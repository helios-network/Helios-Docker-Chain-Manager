const { runMinerNode } = require('../application/run-miner-node');

const runMinerNodeRoute = (app, environement) => {
    app.post('/run-miner-node', async (req, res) => {
        await runMinerNode(app, environement);
        res.send('');
    });
};

module.exports = {
    runMinerNodeRoute
};