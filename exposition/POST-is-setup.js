const fs = require('fs');
const os = require('os');
const path = require('path');

const isSetup = (app, environement) => {
    app.post('/is-setup', async (req, res) => {
        if (app.node) {
            const homedir = os.homedir();
            const genesisPath = path.join(homedir, '.heliades/config/genesis.json');

            if (fs.existsSync(genesisPath)) {
                res.send(true);
                return ;
            }
        }
        res.send(false);
    });
};

module.exports = {
    isSetup
};