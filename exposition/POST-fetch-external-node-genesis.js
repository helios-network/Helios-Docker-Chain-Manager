const { getExternalNodeGenesisAndStatus } = require('../application/get-external-node-genesis-and-status');

const fetchExternalNodeGenesis = (app, environement) => {
    app.post('/fetch-external-node-genesis', async (req, res) => {
        try {
            const nodeIp = req.body['ip'];
            const nodeGrpcPort = req.body['grpcPort'];

            console.log(req.body)

            const externalNodeGenesisAndStatus = await getExternalNodeGenesisAndStatus(nodeIp, nodeGrpcPort);

            if (externalNodeGenesisAndStatus.genesis?.chain_id !== undefined) {
                res.send(externalNodeGenesisAndStatus);
                return ;
            }
            res.send(false);
        } catch (e) {
            console.log(e);
            res.send(false);
        }
    });
};

module.exports = {
    fetchExternalNodeGenesis
};