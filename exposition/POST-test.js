const test = (app, environement) => {
    app.post('/test', async (req, res) => {

        let data = {};

        if (app.node) {
            data.node = {
                status: await app.node.status(),
                logs: app.node.logs,
                infos: await app.node.getInfos()
            };
        }

        if (app.ethStats) {
            await app.ethStats.checkIsAlive();
            data.ethStats = {
                status: app.ethStats?.status ? app.ethStats?.status : '0',
                logs: app.ethStats?.logs ? app.ethStats?.logs : [],
                nodeName: app.ethStats?.nodeName ? app.ethStats?.nodeName : await app.node.getMoniker(),
                serverUrl: app.ethStats?.serverUrl ? app.ethStats?.serverUrl : 'https://stats.helioschainlabs.org',
            }
        }
        
        res.send(data);
    });
};

module.exports = {
    test
};