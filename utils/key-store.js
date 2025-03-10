
const keyth = require('keythereum');

const keyStoreRecover = async (json, password) => {
    const keyobj = JSON.parse(json);
    const privateKey = keyth.recover(password,keyobj);
    console.log(privateKey.toString('hex'));
    return privateKey.toString('hex');
}

module.exports = {
    keyStoreRecover
}