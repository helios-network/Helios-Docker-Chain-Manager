const fs = require('fs');
const { keyStoreRecover } = require('../utils/key-store');
const path = require('path');
const ethers = require('ethers');

const unjailABI = [
    {
        "inputs": [
          {
            "internalType": "address",
            "name": "validatorAddress",
            "type": "address"
          }
        ],
        "name": "unjail",
        "outputs": [
          {
            "internalType": "bool",
            "name": "success",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      }
]

const unjailNode = async (app, environement, password) => {
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

        const contract = new ethers.Contract('0x0000000000000000000000000000000000000800', unjailABI, wallet);

        const unjail = await contract.unjail(wallet.address);

        const receipt = await unjail.wait();

        return receipt?.blockNumber > 0;
    } catch (error) {
        console.error('Erreur lors de l\'unjail du noeud:', error);
        return false;
    }
}

module.exports = {
    unjailNode
}