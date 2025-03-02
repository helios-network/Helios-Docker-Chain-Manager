const fs = require('fs');
const path = require('path');
const os = require('os');

const reinitializeNode = (app, environement) => {
    app.post('/reinitialize-node', async (req, res) => {
        try {
            const heliadesPath = path.join(os.homedir(), '.heliades');
            const nodePath = './node';

            if (!fs.existsSync(nodePath)) {
                fs.mkdirSync(nodePath);
            }
            if (!fs.existsSync(heliadesPath)) {
                fs.mkdirSync(heliadesPath);
            }

            await app.node.checkIsAlive();

            if (app.node.status != '0') {
                await app.node.stop();
            }

            fs.rmSync(nodePath, { recursive: true, force: true });
            fs.rmSync(heliadesPath, { recursive: true, force: true });

            if (fs.existsSync('./.password')) {
                fs.rmSync('./.password');
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