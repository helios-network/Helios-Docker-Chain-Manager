const { createValidator } = require('../application/createValidator');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const validatorCreate = (app, environement) => {
    app.post('/validator-create', async (req, res) => {
        try {
            const passwordCrypted = req.body.password;
            const password = unrot13(atob(passwordCrypted));
            const validatorData = req.body.validatorData; // Récupérer l'objet complet

            if (!validatorData) {
                throw new Error('Données du validateur manquantes');
            }

            const success = await createValidator(app, password, validatorData);
            
            res.send(success);
        } catch (e) {
            console.log('Erreur dans validatorCreate:', e);
            res.send(false);
        }
    });
};

module.exports = {
    validatorCreate
};