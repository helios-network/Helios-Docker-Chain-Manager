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
        
        res.send(data);
    });
};

module.exports = {
    test
};