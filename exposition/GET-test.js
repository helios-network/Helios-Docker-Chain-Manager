const test = (app, environement) => {
    app.get('/test', async (req, res) => {

        let data = {};

        if (app.node) {
            await app.node.checkIsAlive();

            data.node = {
                status: app.node?.status ? app.node?.status : '0',
                mining: app.node?.mining ? app.node?.mining : '0',
                logs: app.node?.logs ? app.node?.logs : []
            };
        }
        
        res.send(data);
    });
};

module.exports = {
    test
};