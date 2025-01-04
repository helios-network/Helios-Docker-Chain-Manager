const ethers = require('ethers');
const atob = require('atob');
const { generateJsonKeyStore } = require('../application/generate-json-keystore');

const rot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) + 13))
    .join('');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const test = (app, environement) => {
    app.post('/generate-json-keystore', async (req, res) => {

        try {
            const privateKey = unrot13(atob(req.body['privateKey']));
            const password = unrot13(atob(req.body['password']));
            const json = await generateJsonKeyStore(privateKey, password);

            if (json === undefined) {
                res.sendStatus(500);
                return ;
            }
            
            res.send(json);
        } catch (e) {
            res.sendStatus(500);
        }
    });
};

module.exports = {
    test
};