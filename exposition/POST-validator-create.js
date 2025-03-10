const fs = require('fs');
const keyth = require('keythereum');
const ethers = require('ethers');
const { execWrapper } = require('../utils/exec-wrapper');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const decrypt2 = async (json, password) => {
    const keyobj = JSON.parse(json);
    const privateKey = keyth.recover(password,keyobj);
    console.log(privateKey.toString('hex'));
    return privateKey.toString('hex');
}

const createValidatorAbi = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "moniker",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "identity",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "website",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "securityContact",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "details",
            "type": "string"
          }
        ],
        "internalType": "struct Description",
        "name": "description",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "rate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxRate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxChangeRate",
            "type": "uint256"
          }
        ],
        "internalType": "struct CommissionRates",
        "name": "commissionRates",
        "type": "tuple"
      },
      {
        "internalType": "uint256",
        "name": "minSelfDelegation",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "validatorAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "pubkey",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "createValidator",
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
];

const validatorCreate = (app, environement) => {
    app.post('/validator-create', async (req, res) => {
        try {
            const passwordCrypted = req.body['password'];
            const address = await app.node.getAddress();

            const moniker = req.body['moniker'];

            const RPC_URL = 'http://localhost:8545';
            const provider = new ethers.JsonRpcProvider(RPC_URL);

            const keyStoreNode = fs.readFileSync(`./node/keystore`).toString();

            const privateKey = await decrypt2(keyStoreNode, unrot13(atob(passwordCrypted)));
            const wallet = new ethers.Wallet(privateKey, provider);

            // const validatorAddress = address; // Adresse Cosmos du validateur
            console.log("wallet : ", wallet.address)

            const description = {
              moniker:          moniker ?? "MyNode",
              identity:         "",
              website:          "https://mynode.example",
              securityContact:  "mynode@example.com",
              details:          "This is my great node"
            };

            const commissionRates = {
              rate:          ethers.parseUnits("0.05", 18),  // 5%
              maxRate:       ethers.parseUnits("0.20", 18),  // 20%
              maxChangeRate: ethers.parseUnits("0.01", 18),  // 1%
            };

            const minSelfDelegation = "1";

            const pubkeyJson = (await execWrapper("heliades tendermint show-validator")).trim()
            const pubkey = JSON.parse(pubkeyJson).key;
            const value             = ethers.parseUnits("10", 18);

            console.log('pubkey', pubkey);

            const contract = new ethers.Contract('0x0000000000000000000000000000000000000800', createValidatorAbi, wallet);
            const tx = await contract.createValidator(
              description,
              commissionRates,
              minSelfDelegation,
              wallet.address,
              pubkey,
              {
                gasPrice: 50000000000,
                gasLimit: 500000,
                value: value
              }
            );
            console.log('Transaction envoyée, hash :', tx.hash);

            const receipt = await tx.wait();
            console.log('Transaction confirmée dans le bloc :', receipt.blockNumber);

            console.log("Validateur créé avec succès !");
            res.send(true);
        } catch (e) {
            console.log(e);
            res.send(false);
        }
    });
};

module.exports = {
  validatorCreate
};