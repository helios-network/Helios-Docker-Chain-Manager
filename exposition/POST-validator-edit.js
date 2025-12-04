const { editValidator } = require('../application/editValidator');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const validatorEdit = (app, environement) => {
    app.post('/validator-edit', async (req, res) => {
        try {
            const passwordCrypted = req.body.password;
            const password = unrot13(atob(passwordCrypted));
            const validatorData = req.body.validatorData;

            if (!validatorData) {
                throw new Error('Validator data missing');
            }

            const result = await editValidator(app, password, validatorData);
            
            if (result && result.error) {
                res.status(400).json(result);
            } else if (result === false || result === undefined) {
                res.status(500).json({ error: 'Failed to update validator' });
            } else {
                res.json(result);
            }
        } catch (e) {
            console.log('Error in validatorEdit:', e);
            res.status(500).json({ error: e.message || 'Failed to update validator' });
        }
    });
};

module.exports = {
    validatorEdit
};

