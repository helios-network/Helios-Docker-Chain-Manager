const path = require('path');
const fs = require('fs');

module.exports = {
    asFile: (app, files) => {
        app.use(function (req, res, next) {

            const file = files.find(x => `/${x}` === req.path);

            if (file) {
                let templates = path.join(process.cwd(), 'html');
                res.sendFile(file, {root: templates});
                return ;
            }
            next();
        });
    },
    auth: (app, environement, loginHtmlFilePath, accessCodeKey = 'access-code', excludedRoutes) => {
        app.use((req, res, next) => {
            const isExcludedRoute = excludedRoutes.find(x =>  `${x}` === req.path);

            if (!isExcludedRoute) { // route who needed permissions
                if (req.query[accessCodeKey] == undefined && environement.password == undefined
                && req.headers[accessCodeKey] == undefined && environement.password == undefined) {
                    const loginHtmlFile = (fs.readFileSync(loginHtmlFilePath)).toString();
                    res.send(loginHtmlFile);
                    return ;
                }
                if (req.headers[accessCodeKey] != undefined && environement.password == undefined) {
                    environement.password = req.headers[accessCodeKey];
                }
                if (req.query[accessCodeKey] != undefined && environement.password == undefined) {
                    environement.password = req.query[accessCodeKey];
                }
                if (req.headers[accessCodeKey] != environement.password
                && req.query[accessCodeKey] != environement.password) {
                    res.sendStatus(502); // simulate server is offline (Bad Gateway code).
                    return ;
                }
                // end auth
            }
            next();
        });
    },
    setHeaders: (app, headers = []) => {
        app.use(function (req, res, next) {
            headers.forEach(header => {
                res.setHeader(header[0], header[1]);
            });
            next();
        });
    }
};