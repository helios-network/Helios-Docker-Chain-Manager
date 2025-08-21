const fs = require('fs');
const os = require('os');
const path = require('path');

const isSetup = (app, environement) => {
    app.post('/is-setup', async (req, res) => {
        if (app.node) {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const genesisPath = path.join(homeDirectory, 'config/genesis.json');

            if (fs.existsSync(genesisPath)) {
                res.send(true);
                return ;
            }
        }
        res.send(true);
    });
};

module.exports = {
    isSetup
};