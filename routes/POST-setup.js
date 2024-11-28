const fs = require('fs');
const { execWrapper } = require('../utils/exec-wrapper');
const keyth = require('keythereum');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const decrypt2 = async (json, password) => {
    const keyobj = JSON.parse(json);
    const privateKey = keyth.recover(password,keyobj);
    console.log(privateKey.toString('hex'));
    return privateKey.toString('hex');
}

const install = async (keyStoreNode, passwordCrypted) => {
    // yes yes is for overloading if already exists
    const result = await execWrapper(`yes yes | heliades keys add node --from-private-key="${await decrypt2(keyStoreNode, unrot13(atob(passwordCrypted)))}"`);

    if (result.includes("name: node")) {
        console.log(result);
        return true;
    }
    console.log(result);
    return false;
}

const setup = (app, environement) => {
    app.post('/setup', async (req, res) => {
        try {
            const keyStoreNode = req.body['keyStoreNode'];
            const passwordCrypted = req.body['password'];

            if (!fs.existsSync('./node')) {
                fs.mkdirSync('./node');
            }
            const jsonKeyStoreNode = JSON.parse(keyStoreNode);

            fs.writeFileSync(`./node/id`, jsonKeyStoreNode.address);
            fs.writeFileSync(`./node/keystore`, keyStoreNode);

            await install(keyStoreNode, passwordCrypted);

            res.send({ status: 'ready' });

        } catch (e) {
            res.send({ status: 'ko' });
            console.log(e);
        }
    });
};

module.exports = {
    setup
};