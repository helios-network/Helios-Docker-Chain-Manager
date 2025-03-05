const ethers = require('ethers');

const fetchWallet = (app, environement) => {
    app.post('/fetch-wallet', async (req, res) => {
        try {
            if (await app.node.status() == '0') { // node offline
                res.send(false);
                return ;
            }

            const RPC_URL = 'http://localhost:8545';
            const provider = new ethers.JsonRpcProvider(RPC_URL);

            const address = await app.node.getAddress();

            const balanceInWei = await provider.getBalance(address);
            const balance = ethers.formatEther(balanceInWei);

            res.send({
                address: address,
                balance: balance
            });
        } catch (e) {
            console.log(e);
            res.send(false);
        }
    });
};

module.exports = {
    fetchWallet
};