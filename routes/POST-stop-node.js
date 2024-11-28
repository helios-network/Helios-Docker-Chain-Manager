const status = (app, environement) => {
    app.post('/stop-node', async (req, res) => {
        if (!app.node) {
            res.send(false);
            return ;
        }
        app.node.stop();
        res.send(true);
    });
};

module.exports = {
    status
};