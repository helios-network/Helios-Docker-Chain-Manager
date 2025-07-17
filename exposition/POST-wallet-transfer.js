const { transferWallet } = require('../application/transferWallet');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const walletTransfer = (app, environement) => {
    app.post('/wallet-transfer', async (req, res) => {
        try {
            const passwordCrypted = req.body.password;
            const password = unrot13(atob(passwordCrypted));
            const walletData = req.body.walletData;

            if (!walletData) {
                throw new Error('Données du wallet manquantes');
            }

            const hash = await transferWallet(app, password, walletData);
            
            res.send(hash);
        } catch (e) {
            console.log('Erreur dans walletTransfer:', e);
            res.send(false);
        }
    });
};

module.exports = {
    walletTransfer
};