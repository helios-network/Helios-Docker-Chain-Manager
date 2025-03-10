const getExternalNodeGenesisAndStatus = async (nodeIp, nodeGrpcPort) => {
    const nodeGrpcURL = `http://${nodeIp}:${nodeGrpcPort}`;

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
        return {
            genesisURL: `${nodeGrpcURL}/genesis-raw`,
            grpcURL: nodeGrpcURL,
            statusURL: `${nodeGrpcURL}/status`,
            genesis: genesis,
            status: status
        };
    }
    return undefined;
}

module.exports = {
    getExternalNodeGenesisAndStatus
}