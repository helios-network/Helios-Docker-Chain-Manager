const { keyStoreRecover } = require("../utils/key-store");
const { execWrapper } = require('../utils/exec-wrapper');
const fs = require('fs');
const ethers = require('ethers');
const path = require('path');

const createTokenAbi = [
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "symbol", "type": "string" },
      { "internalType": "string", "name": "denom", "type": "string" },
      { "internalType": "uint256", "name": "totalSupply", "type": "uint256" },
      { "internalType": "uint8", "name": "decimals", "type": "uint8" },
      { "internalType": "string", "name": "logoBase64", "type": "string" }
    ],
    "name": "createErc20",
    "outputs": [
      { "internalType": "address", "name": "tokenAddress", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const createToken = async (app, password, retry = 0) => {
    try {
        const RPC_URL = 'http://localhost:8545';
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        const homeDirectory = await app.actions.getHomeDirectory.use();
        const keyStoreNode = fs.readFileSync(path.join(homeDirectory, 'keystore')).toString();

        const privateKey = await keyStoreRecover(keyStoreNode, password);
        const wallet = new ethers.Wallet(privateKey, provider);

        const contract = new ethers.Contract('0x0000000000000000000000000000000000000806', createTokenAbi, wallet);

        const tokenName = 'BTC';
        const tokenSymbol = 'BTC';
        const tokenDenom = 'uBTC'; // denomination of one unit of the token
        const tokenTotalSupply = ethers.parseUnits('21000000', 18);
        const tokenDecimals = 18;

        const tx = await contract.createErc20(tokenName, tokenSymbol, tokenDenom, tokenTotalSupply, tokenDecimals, "");

        console.log('Transaction envoyée, hash :', tx.hash);

        const txReceipt = await tx.wait();
        console.log('Transaction confirmée dans le bloc :', txReceipt.blockNumber);

        console.log("Token créé !");

        return true;
    } catch (e) {
        console.log('Erreur complète:', e);
        if (retry >= 5) {
            console.log('createToken failed.');
            console.log(e);
            return false;
        }
        console.log('createToken failed retry...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return createToken(app, password, retry + 1);
    }
}

module.exports = {
  createToken
}