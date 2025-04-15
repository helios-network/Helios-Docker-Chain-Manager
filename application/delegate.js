const { keyStoreRecover } = require("../utils/key-store");
const { execWrapper } = require('../utils/exec-wrapper');
const fs = require('fs');
const ethers = require('ethers');

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
        },
        {
          "internalType": "uint256",
          "name": "minDelegation",
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
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "delegatorAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "validatorAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "denom",
          "type": "string"
        }
      ],
      "name": "delegate",
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

const delegate = async (password, retry = 0) => {
    try {
        const RPC_URL = 'http://localhost:8545';
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        const keyStoreNode = fs.readFileSync(`./node/keystore`).toString();

        const privateKey = await keyStoreRecover(keyStoreNode, password);
        const wallet = new ethers.Wallet(privateKey, provider);

        const validatorAddress = wallet.address;
        const valueDelegate = ethers.parseUnits("10", 18);

        const contract = new ethers.Contract('0x0000000000000000000000000000000000000800', createValidatorAbi, wallet);

        const delegateTx = await contract.delegate(
            validatorAddress,
            validatorAddress,
            valueDelegate,
            "ueth", {
              gasPrice: 20000000000,
              gasLimit: 500000
            }
        );

        console.log('Transaction envoyée, hash :', delegateTx.hash);

        const delegateReceipt = await delegateTx.wait();
        console.log('Transaction confirmée dans le bloc :', delegateReceipt.blockNumber);

        console.log("Délégation réussie !");

        return true;
    } catch (e) {
        console.log('Erreur complète:', e);
        if (retry >= 0) {
            console.log('delegate failed.');
            console.log(e);
            return false;
        }
        console.log('delegate failed retry...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return createValidator(password, retry + 1);
    }
}

module.exports = {
  delegate
}