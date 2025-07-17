const { keyStoreRecover } = require("../utils/key-store");
const { execWrapper } = require('../utils/exec-wrapper');
const fs = require('fs');
const ethers = require('ethers');
const path = require('path');

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

const createValidator = async (app, password, validatorData, retry = 0) => {
    try {
        const RPC_URL = 'http://localhost:8545';
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        const homeDirectory = await app.actions.getHomeDirectory.use();
        const keyStoreNode = fs.readFileSync(path.join(homeDirectory, 'keystore')).toString();
        const nodeMoniker = fs.readFileSync(path.join(homeDirectory, 'moniker')).toString();

        const privateKey = await keyStoreRecover(keyStoreNode, password);
        if (privateKey == undefined) {
            return false;
        }
        const wallet = new ethers.Wallet(privateKey, provider);

        console.log("Données reçues dans createValidator:", validatorData); // Debug log

        if (!validatorData) {
            throw new Error(`Données invalides: ${JSON.stringify(validatorData)}`);
        }

        const description = {
            moniker: nodeMoniker,
            identity: "",
            website: "https://mynode.example",
            securityContact: "mynode@example.com",
            details: "This is my great node"
        };

        const commissionRates = {
            rate: ethers.parseUnits(validatorData.commission.rate.toString(), 18),
            maxRate: ethers.parseUnits(validatorData.commission.maxRate.toString(), 18),
            maxChangeRate: ethers.parseUnits(validatorData.commission.maxChangeRate.toString(), 18)
        };

        const minSelfDelegation = validatorData.minSelfDelegation.toString(); // minimum share

        const validatorAddress = wallet.address;

        const pubkeyJson = (await(execWrapper(`heliades tendermint show-validator`))).trim();
        const pubkey = JSON.parse(pubkeyJson).key;
        const value = ethers.parseUnits("1", 18); // by default 1 HLS

        console.log('Données formatées:', {
            description,
            commissionRates,
            minSelfDelegation,
            validatorAddress,
            pubkey,
            value
        });

        const contract = new ethers.Contract('0x0000000000000000000000000000000000000800', createValidatorAbi, wallet);
        
        const tx = await contract.createValidator(
            description,
            commissionRates,
            minSelfDelegation,
            validatorAddress,
            pubkey,
            value,
            0 // minDelegation
        );

        console.log('Transaction envoyée, hash :', tx.hash);

        const receipt = await tx.wait();
        console.log('Transaction confirmée dans le bloc :', receipt.blockNumber);

        console.log("Validateur créé avec succès !");

        // await new Promise((resolve) => setTimeout(resolve, 10000));

        // const valueDelegate = ethers.parseUnits("10", 18);

        // const delegateTx = await contract.delegate(
        //     validatorAddress,
        //     validatorAddress,
        //     valueDelegate,
        //     "ueth", {
        //       gasPrice: 20000000000,
        //       gasLimit: 500000
        //     }
        // );

        // console.log('Transaction envoyée, hash :', delegateTx.hash);

        // const delegateReceipt = await delegateTx.wait();
        // console.log('Transaction confirmée dans le bloc :', delegateReceipt.blockNumber);

        // console.log("Délégation réussie !");

        return true;
    } catch (e) {
        console.log('Erreur complète:', e);
        if (retry >= 0) {
            console.log('createValidator failed.');
            console.log(e);
            return false;
        }
        console.log('createValidator failed retry...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return createValidator(app, password, validatorData, retry + 1);
    }
}

module.exports = {
    createValidator
}