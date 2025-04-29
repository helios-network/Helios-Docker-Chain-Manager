const { doAction } = require("../automation/automation");

const status = (app, environement) => {
    app.post('/action', async (req, res) => {

        const action = req.body;

        await doAction(app, environement, action);
        res.send(true);
    });
};

module.exports = {
    status
};