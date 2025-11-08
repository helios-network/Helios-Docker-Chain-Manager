const fs = require('fs');
const keyth = require('keythereum');
const ethers = require('ethers');
const path = require('path');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const decrypt2 = async (json, password) => {
    const keyobj = JSON.parse(json);
    const privateKey = keyth.recover(password,keyobj);
    return privateKey.toString('hex');
}

const withdrawDelegatorCommissionAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "validatorAddress",
        "type": "address"
      }
    ],
    "name": "withdrawValidatorCommission",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "denom",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "internalType": "struct Coin[]",
        "name": "amount",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const validatorClaimCommission = (app, environement) => {
    app.post('/validator-claim-commission', async (req, res) => {
        try {
            const passwordCrypted = req.body['password'];
            const address = await app.node.getAddress();

            const RPC_URL = 'http://localhost:8545';
            const provider = new ethers.JsonRpcProvider(RPC_URL);

            const homeDirectory = await app.actions.getHomeDirectory.use();
            const keyStoreNode = fs.readFileSync(path.join(homeDirectory, 'keystore')).toString();

            const privateKey = await decrypt2(keyStoreNode, unrot13(atob(passwordCrypted)));
            const wallet = new ethers.Wallet(privateKey, provider);

            console.log("wallet : ", wallet.address)
            console.log('WithdrawCommission en cours...');

            const contract = new ethers.Contract('0x0000000000000000000000000000000000000801', withdrawDelegatorCommissionAbi, wallet);
            const tx = await contract.withdrawValidatorCommission(wallet.address);
            console.log('Transaction envoyée, hash :', tx.hash);

            const receipt = await tx.wait();
            console.log('Transaction confirmée dans le bloc :', receipt.blockNumber);

            console.log('WithdrawCommission réussie !');
            res.send(true);
        } catch (e) {
            console.log(e);
            res.send(false);
        }
    });
};

module.exports = {
  validatorClaimCommission
};