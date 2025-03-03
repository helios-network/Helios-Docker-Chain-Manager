const test = (app, environement) => {
    app.get('/test', async (req, res) => {

        let data = {};

        if (app.node) {
            data.node = {
                status: await app.node.status(),
                logs: app.node.logs
            };

            if (app.node.status == '1') {
                data.node.infos = {
                    ... await app.node.getInfos()
                };
            }
        }
        
        res.send(data);
    });
};

module.exports = {
    test
};