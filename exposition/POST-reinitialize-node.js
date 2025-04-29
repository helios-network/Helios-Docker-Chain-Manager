const fs = require('fs');
const path = require('path');

const reinitializeNode = (app, environement) => {
    app.post('/reinitialize-node', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();

            if (!fs.existsSync(homeDirectory)) {
                fs.mkdirSync(homeDirectory);
            }
            if (!fs.existsSync(path.join(homeDirectory, 'config'))) {
                fs.mkdirSync(path.join(homeDirectory, 'config'));
            }
            if (!fs.existsSync(path.join(homeDirectory, 'data'))) {
                fs.mkdirSync(path.join(homeDirectory, 'data'));
            }
            if (!fs.existsSync(path.join(homeDirectory, 'keyring-local'))) {
                fs.mkdirSync(path.join(homeDirectory, 'keyring-local'));
            }

            if (await app.node.status() != '0') {
                await app.node.stop();
            }

            fs.rmSync(path.join(homeDirectory, 'config'), { recursive: true, force: true });
            fs.rmSync(path.join(homeDirectory, 'data'), { recursive: true, force: true });
            fs.rmSync(path.join(homeDirectory, 'keyring-local'), { recursive: true, force: true });

            if (fs.existsSync(path.join(homeDirectory, '.password'))) {
                fs.rmSync(path.join(homeDirectory, '.password'));
            }
            res.send(true);
        } catch (e) {
            res.send(false);
            console.log(e);
        }
    });
};

module.exports = {
    reinitializeNode
};