const { keyStoreRecover } = require("../utils/key-store");
const { execWrapper } = require('../utils/exec-wrapper');
const fs = require('fs');
const ethers = require('ethers');
const path = require('path');

const transferTokenAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const transferToken = async (app, password, tokenAddress, to, amount, retry = 0) => {
    try {
        const RPC_URL = 'http://localhost:8545';
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        const homeDirectory = await app.actions.getHomeDirectory.use();
        const keyStoreNode = fs.readFileSync(path.join(homeDirectory, 'keystore')).toString();

        const privateKey = await keyStoreRecover(keyStoreNode, password);
        if (privateKey == undefined) {
            return false;
        }
        const wallet = new ethers.Wallet(privateKey, provider);

        const contract = new ethers.Contract(tokenAddress, transferTokenAbi, wallet);

        const amountBigInt = ethers.parseUnits(amount, 18);

        const tx = await contract.transfer(to, amountBigInt);

        console.log('Transaction envoyée, hash :', tx.hash);

        const txReceipt = await tx.wait();
        console.log('Transaction confirmée dans le bloc :', txReceipt.blockNumber);

        console.log("Token transféré !");

        return true;
    } catch (e) {
        console.log('Erreur complète:', e);
        if (retry >= 5) {
            console.log('transferToken failed.');
            console.log(e);
            return false;
        }
        console.log('transferToken failed retry...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return transferToken(app, password, retry + 1);
    }
}

module.exports = {
  transferToken
}