const { doAction } = require("../automation/automation");
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const status = (app, environement) => {
    app.get('/download-chain', async (req, res) => {
        try {

            const homeDirectory = await app.actions.getHomeDirectory.use();
            const files = fs.readdirSync(path.join(homeDirectory, 'data'));

            const chainFiles = files.filter(file => file.endsWith('.db'));
                
            // Set the appropriate headers for zip download
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename=chain-files.zip');

            // Create zip archive
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            // Pipe the archive to the response
            archive.pipe(res);

            // Add each chain file to the archive
            chainFiles.forEach(file => {
                const filePath = path.join(homeDirectory, 'data', file);
                archive.file(filePath, { name: file });
            });

            // Finalize the archive
            await archive.finalize();

        } catch (error) {
            console.error('Error during chain download:', error);
            res.status(500).send('Error downloading chain files');
        }
        // res.send(true);
    });
};

module.exports = {
    status
};