const fetchExternalNodeGenesis = (app, environement) => {
    app.post('/fetch-external-node-genesis', async (req, res) => {
        try {
            const nodeIp = req.body['ip'];
            const nodeGrpcPort = req.body['grpcPort'];

            const nodeGrpcURL = `http://${nodeIp}:${nodeGrpcPort}`;

            new URL(nodeGrpcURL); // try format url

            const responseGenesis = await fetch(`${nodeGrpcURL}/genesis-raw`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const genesis = await responseGenesis.json();

            const responseStatus = await fetch(`${nodeGrpcURL}/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const status = (await responseStatus.json()).result;

            if (genesis.chain_id !== undefined) {
                res.send({
                    genesis: genesis,
                    status: status
                });
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