const testHyperion = (app, environement) => {
    app.post('/test-hyperion', async (req, res) => {

        let data = {};

        if (app.hyperion) {
            data.hyperion = {
                status: await app.hyperion.status(),
                logs: app.hyperion.logs
            };
        }
        
        res.send(data);
    });
};

module.exports = {
    testHyperion
};