const callRpc = (app, environement) => {
    app.post('/call-rpc', async (req, res) => {
        try {
            // "eth_getValidatorAndHisDelegation"

            if (await app.node.status() == '0') { // node offline
                res.send(false);
                return ;
            }

            const address = await app.node.getAddress();
            console.log(address);
            const response = await fetch(`http://localhost:8545`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "jsonrpc":"2.0",
                    "method": req.body['method'],
                    "params": req.body['params'].map(x => x.replace(/\$address/gm, address)),
                    "id":1
                })
            });
            const result = await response.json();

            if (result.error !== undefined) {
                res.send(false);
                return ;
            }
            res.send(result.result);
        } catch (e) {
            console.log(e);
            res.send(false);
        }
    });
};

module.exports = {
    callRpc
};