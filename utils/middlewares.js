const path = require('path');
const fs = require('fs');
const moment = require('moment');

const rot13 = str => str.split('').map(char => String.fromCharCode(char.charCodeAt(0) + 13)).join('');
const unrot13 = str => str.split('').map(char => String.fromCharCode(char.charCodeAt(0) - 13)).join('');
const decodePasswordPayload = (payload) => {
    if (typeof payload !== 'string') {
        return payload;
    }

    if (payload.startsWith('enc:')) {
        const encoded = payload.slice(4);
        try {
            const shiftedBuffer = Buffer.from(encoded, 'base64');
            for (let i = 0; i < shiftedBuffer.length; i += 1) {
                shiftedBuffer[i] = (shiftedBuffer[i] - 13 + 256) & 0xff;
            }
            return shiftedBuffer.toString('utf8');
        } catch (error) {
            try {
                const base64Decoded = Buffer.from(encoded, 'base64').toString('latin1');
                return unrot13(base64Decoded);
            } catch (legacyError) {
            }
        }
    }

    return payload;
};

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
        app.use(async (req, res, next) => {

            if (req.path === '/auth') {
                const homeDirectory = await app.actions.getHomeDirectory.use();
                if (fs.existsSync(path.join(homeDirectory, '.password'))) {
                    res.send(true);
                    return ;
                }
                res.send(false);
                return ;
            }

            if (req.path === '/auth-try') {
                const homeDirectory = await app.actions.getHomeDirectory.use();
                if (fs.existsSync(path.join(homeDirectory, '.password')) && req.body['password'] != undefined
                    && (app.lastAuthFailedTime === undefined || moment(app.lastAuthFailedTime).add(10, 'seconds').isBefore(moment())) // anti brut force
                    ) {
                    const pass = fs.readFileSync(path.join(homeDirectory, '.password')).toString();
                    const providedPassword = decodePasswordPayload(req.body['password']);
                    const equals = providedPassword === pass;

                    if (!equals) {
                        app.lastAuthFailedTime = moment().valueOf();
                    }
                    res.send(equals);
                    return ;
                }
                res.send(false);
                return ;
            }

            if (req.path === '/auth-subscribe') {
                const homeDirectory = await app.actions.getHomeDirectory.use();
                const providedPassword = decodePasswordPayload(req.body['password']);

                if (fs.existsSync(path.join(homeDirectory, '.password'))
                    || providedPassword == undefined
                    || providedPassword === '') {
                    res.send(false);
                    return ;
                }
                environement.password = providedPassword;
                fs.writeFileSync(path.join(homeDirectory, '.password'), environement.password);
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

            // Check if route exists, including dynamic routes with parameters
            const routeExists = app._router.stack.some(layer => {
                if (!layer.route) return false;
                
                // For exact path matches
                if (layer.route.path === req.path) return true;
                
                // For dynamic routes with parameters (e.g., /backup-download/:filename)
                if (layer.route.path.includes(':')) {
                    const routePattern = layer.route.path.replace(/:[^/]+/g, '[^/]+');
                    const regex = new RegExp(`^${routePattern}$`);
                    return regex.test(req.path);
                }
                
                return false;
            });
            
            if (!routeExists) {
                res.send((fs.readFileSync(notFounHtmlFilePath)).toString());
                return ;
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
