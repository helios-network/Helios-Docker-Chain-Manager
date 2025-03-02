const isSetup = (app, environement) => {
    app.get('/is-setup', async (req, res) => {
        if (app.node) {
            res.send(true);
            return ;
        }
        res.send(false);
    });
};

module.exports = {
    isSetup
};