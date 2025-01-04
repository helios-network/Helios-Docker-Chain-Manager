const fs = require('fs');

const getHtmlContent = (environement) => {
    let content = (fs.readFileSync('./html/pages/status.html')).toString();

    content = content.replace(/\$password/, environement.password);
    content = content.replace(/\$setup/, "true");
    const nodeAddress = fs.readFileSync('./node/id').toString();

    content = content.replace(/\$node1Address/, `0x${nodeAddress}`);
    return content;
}

const status = (app, environement) => {
    app.get('/html-page-status', async (req, res) => {

        let htmlContent = getHtmlContent(environement);

        res.send(htmlContent);
    });
};

module.exports = {
    status
};