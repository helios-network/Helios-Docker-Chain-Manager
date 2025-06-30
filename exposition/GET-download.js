const { doAction } = require("../automation/automation");
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const downloadFile = async (app, req, res, filename) => {
    try {
        const homeDirectory = await app.actions.getHomeDirectory.use();
        const filePath = path.join(homeDirectory, 'config', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }
        const fileContent = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(fileContent);

    } catch (error) {
        console.error('Error during JSON download:', error);
        res.status(500).send('Error downloading JSON file');
    }
}

const download = (app, environement) => {
    // Endpoint for downloading a specific JSON file
    app.get('/download/genesis.json', async (req, res) => {
        await downloadFile(app, req, res, 'genesis.json');
    });

    app.get('/download/config.toml', async (req, res) => {
        await downloadFile(app, req, res, 'config.toml');
    });

    app.get('/download/app.toml', async (req, res) => {
        await downloadFile(app, req, res, 'app.toml');
    });

    app.get('/download/node_key.json', async (req, res) => {
        await downloadFile(app, req, res, 'node_key.json');
    });

    app.get('/download/priv_validator_key.json', async (req, res) => {
        await downloadFile(app, req, res, 'priv_validator_key.json');
    });

    app.get('/download/addrbook.json', async (req, res) => {
        await downloadFile(app, req, res, 'addrbook.json');
    });

    app.get('/download/client.toml', async (req, res) => {
        await downloadFile(app, req, res, 'client.toml');
    });
};

module.exports = {
    download
};