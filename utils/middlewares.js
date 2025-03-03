const path = require('path');
const fs = require('fs');
const moment = require('moment');

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
    asPageFile: (app, files) => {
        app.use(function (req, res, next) {

            const fileOrFileAndPath = files.find(x => {
                if (typeof x === 'object') {
                    return x.path === req.path;
                }
                return `/${x}` === req.path;
            });

            if (fileOrFileAndPath) {
                const file = typeof fileOrFileAndPath === 'object' ? fileOrFileAndPath.file : fileOrFileAndPath;
                let templates = path.join(process.cwd(), 'html');
                res.sendFile(`/pages/${file}.html`, {root: templates});
                return ;
            }
            next();
        });
    },
    auth: (app, environement, notFounHtmlFilePath, accessCodeKey = 'access-code', excludedRoutes) => {
        app.use((req, res, next) => {

            if (req.path === '/auth') {
                if (fs.existsSync('./.password')) {
                    res.send(true);
                    return ;
                }
                res.send(false);
                return ;
            }

            if (req.path === '/auth-try') {
                if (fs.existsSync('./.password') && req.body['password'] != undefined
                    && (app.lastAuthFailedTime === undefined || moment(app.lastAuthFailedTime).add(10, 'seconds').isBefore(moment())) // anti brut force
                    ) {
                    const pass = fs.readFileSync('./.password').toString();
                    const equals = req.body['password'] === pass;

                    if (!equals) {
                        app.lastAuthFailedTime = moment(app.lastAuthFailedTime).toDate().getTime();
                    }
                    res.send(equals);
                    return ;
                }
                res.send(false);
                return ;
            }

            if (req.path === '/auth-subscribe') {
                if (fs.existsSync('./.password')
                    || req.body['password'] == undefined
                    || req.body['password'] == '') {
                    res.send(false);
                    return ;
                }
                environement.password = req.body['password'];
                fs.writeFileSync('./.password', environement.password);
                res.send(true);
                return ;
            }

            const isExcludedRoute = excludedRoutes.find(x =>  `${x}` === req.path);

            if (!isExcludedRoute) { // route who needed permissions
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