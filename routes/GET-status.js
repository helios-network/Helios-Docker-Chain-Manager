const fs = require('fs');

const getHtmlContent = (environement) => {
    let content = (fs.readFileSync('./html/pages/status.html')).toString();

    content = content.replace(/\$password/, environement.password);
    return content;
}

const status = (app, environement) => {
    app.get('/status', async (req, res) => {

        let htmlContent = getHtmlContent(environement);

        res.send(htmlContent);
    });
};

module.exports = {
    status
};