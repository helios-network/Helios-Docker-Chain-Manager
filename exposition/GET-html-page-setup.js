const fs = require('fs');

const getHtmlContent = (environement) => {
    let content = (fs.readFileSync('./html/pages/setup.html')).toString();

    content = content.replace(/\$password/, environement.password);
    return content;
}

const status = (app, environement) => {
    app.get('/html-page-setup', async (req, res) => {

        let htmlContent = getHtmlContent(environement);
        res.send(htmlContent);
    });
};

module.exports = {
    status
};