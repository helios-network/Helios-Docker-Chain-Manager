const ethStatsKill = (app, environement) => {
    app.post('/ethstats-kill', async (req, res) => {
        if (!app.ethStats) {
            res.send(false);
            return ;
        }
        app.ethStats.stop();
        res.send(true);
    });
};

module.exports = {
    ethStatsKill
};