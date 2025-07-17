const { keyStoreRecover } = require("../utils/key-store");
const { execWrapper } = require('../utils/exec-wrapper');
const fs = require('fs');
const ethers = require('ethers');
const path = require('path');

const transferWallet = async (app, password, walletData) => {
    try {
        console.log(walletData)
        const RPC_URL = 'http://localhost:8545';
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        const homeDirectory = await app.actions.getHomeDirectory.use();
        const keyStoreNode = fs.readFileSync(path.join(homeDirectory, 'keystore')).toString();

        const privateKey = await keyStoreRecover(keyStoreNode, password);
        if (privateKey == undefined) {
            return {
                error: "Invalid password"
            };
        }
        const wallet = new ethers.Wallet(privateKey, provider);

        const amount = walletData.amount;
        const addressTo = walletData.to;

        const tx = await wallet.sendTransaction({
            to: addressTo,
            value: ethers.parseEther(amount)
        });

        return {
            hash: tx.hash
        };
    } catch (e) {
        return {
            error: e.message
        };
    }
}

module.exports = {
    transferWallet
}