const ethers = require('ethers');
const atob = require('atob');

const rot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) + 13))
    .join('');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const test = (app, environement) => {
    app.post('/generate-json-keystore', async (req, res) => {

        try {
            let privateKey = unrot13(atob(req.body['privateKey']));
            let password = unrot13(atob(req.body['password']));
            const wallet = new ethers.Wallet(privateKey);
            
            // works only with ethers@5.1.4
            const json = await wallet.encrypt(password, {
                scrypt: {
                    // The number must be a power of 2 (default: 131072)
                    N: 64
                }
            });
            res.send(json);
        } catch (e) {
            res.sendStatus(500);
        }
    });
};

module.exports = {
    test
};