const { keyStoreRecover } = require("../utils/key-store");
const { execWrapper } = require('../utils/exec-wrapper');
const fs = require('fs');
const ethers = require('ethers');
const path = require('path');

const editValidatorAbi = [
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
          "internalType": "address",
          "name": "validatorAddress",
          "type": "address"
        },
        {
          "internalType": "int256",
          "name": "commissionRate",
          "type": "int256"
        },
        {
          "internalType": "int256",
          "name": "minSelfDelegation",
          "type": "int256"
        },
        {
          "internalType": "int256",
          "name": "minDelegation",
          "type": "int256"
        },
        {
          "internalType": "bool",
          "name": "delegateAuthorization",
          "type": "bool"
        }
      ],
      "name": "editValidator",
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

const editValidator = async (app, password, validatorData, retry = 0) => {
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

        console.log("Données reçues dans editValidator:", validatorData); // Debug log

        if (!validatorData) {
            throw new Error(`Données invalides: ${JSON.stringify(validatorData)}`);
        }

        const description = {
            moniker: nodeMoniker,
            identity: "",
            website: "https://mynode.example", // favicon will be taken from display of validator on every websites. (https://example.com/favicon.ico)
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
        const delegateAuthorization = validatorData.delegateAuthorization || true;

        console.log('Données formatées:', {
          description,
          validatorAddress,
          commissionRates,
          minSelfDelegation,
          minDelegation: 0, // minDelegation
          delegateAuthorization
        });

        const contract = new ethers.Contract('0x0000000000000000000000000000000000000800', editValidatorAbi, wallet);
        
        const tx = await contract.editValidator(
            description,
            validatorAddress,
            commissionRates,
            minSelfDelegation,
            0, // minDelegation
            delegateAuthorization
        );

        console.log('Transaction envoyée, hash :', tx.hash);

        const receipt = await tx.wait();
        console.log('Transaction confirmée dans le bloc :', receipt.blockNumber);

        console.log("Validateur modifié avec succès !");
        return true;
    } catch (e) {
        console.log('Erreur complète:', e);
        if (retry >= 0) {
            console.log('editValidator failed.');
            console.log(e);
            return false;
        }
        console.log('editValidator failed retry...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return editValidator(app, password, validatorData, retry + 1);
    }
}

module.exports = {
    editValidator
}