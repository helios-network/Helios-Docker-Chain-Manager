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
        const nodeMoniker = fs.readFileSync(path.join(homeDirectory, 'moniker')).toString().trim();

        const privateKey = await keyStoreRecover(keyStoreNode, password);
        if (privateKey == undefined) {
            return false;
        }
        const wallet = new ethers.Wallet(privateKey, provider);

        if (!validatorData) {
            throw new Error(`Invalid data: ${JSON.stringify(validatorData)}`);
        }

        const descriptionInput = validatorData.description || {};
        const description = {
            moniker: (descriptionInput.moniker || nodeMoniker || '').trim(),
            identity: (descriptionInput.identity || '').trim(),
            website: (descriptionInput.website || 'https://mynode.example').trim(), // favicon will be taken from display of validator on every websites. (https://example.com/favicon.ico)
            securityContact: (descriptionInput.securityContact || 'mynode@example.com').trim(),
            details: (descriptionInput.details || 'This is my great node').trim()
        };

        const commissionRate = ethers.parseUnits(validatorData.commission.rate.toString(), 18);

        const minSelfDelegation = BigInt(validatorData.minSelfDelegation.toString());
        const minDelegation = BigInt(0);

        const validatorAddress = wallet.address;

        const delegateAuthorization = validatorData.delegateAuthorization !== undefined ? validatorData.delegateAuthorization : true;

        const contract = new ethers.Contract('0x0000000000000000000000000000000000000800', editValidatorAbi, wallet);
        
        let tx;
        let revertReason = null;
        
        try {
            tx = await contract.editValidator(
                description,
                validatorAddress,
                commissionRate,
                minSelfDelegation,
                minDelegation,
                delegateAuthorization
            );
        } catch (txError) {
            if (txError.info?.error?.message) {
                const errorMsg = txError.info.error.message;
                if (errorMsg.includes('commission cannot be changed')) {
                    revertReason = 'Commission rate cannot be changed more than once in 24 hours';
                } else if (errorMsg.includes('desc =')) {
                    revertReason = errorMsg.split('desc =')[1]?.trim() || errorMsg;
                } else {
                    revertReason = errorMsg;
                }
            }
            
            if (txError.code === 'CALL_EXCEPTION' || txError.code === 'BAD_DATA') {
                try {
                    tx = await contract.editValidator(
                        description,
                        validatorAddress,
                        commissionRate,
                        minSelfDelegation,
                        minDelegation,
                        delegateAuthorization,
                        {
                            gasPrice: 20000000000,
                            gasLimit: 500000
                        }
                    );
                } catch (txError2) {
                    if (txError2.info?.error?.message) {
                        const errorMsg = txError2.info.error.message;
                        if (errorMsg.includes('commission cannot be changed')) {
                            revertReason = 'Commission rate cannot be changed more than once in 24 hours';
                        } else if (errorMsg.includes('desc =')) {
                            revertReason = errorMsg.split('desc =')[1]?.trim() || errorMsg;
                        } else {
                            revertReason = errorMsg;
                        }
                    }
                    
                    throw txError2;
                }
            } else {
                throw txError;
            }
        }

        let receipt;
        try {
            receipt = await tx.wait();
        } catch (waitError) {
            if (waitError.receipt && waitError.receipt.status === 0) {
                if (!revertReason) {
                    if (waitError.info?.error?.message) {
                        const errorMsg = waitError.info.error.message;
                        if (errorMsg.includes('commission cannot be changed')) {
                            revertReason = 'Commission rate cannot be changed more than once in 24 hours';
                        } else if (errorMsg.includes('desc =')) {
                            revertReason = errorMsg.split('desc =')[1]?.trim() || errorMsg;
                        } else {
                            revertReason = errorMsg;
                        }
                    } else {
                        revertReason = 'Transaction reverted. The validator update may have failed due to contract restrictions (e.g., commission rate change limit).';
                    }
                }
                
                const error = new Error(revertReason);
                error.revertReason = revertReason;
                throw error;
            }
            throw waitError;
        }
        
        if (receipt.status === 0) {
            if (!revertReason) {
                revertReason = 'Transaction reverted. The validator update may have failed due to contract restrictions.';
            }
            const error = new Error(revertReason);
            error.revertReason = revertReason;
            throw error;
        }

        return true;
    } catch (e) {
        if (retry >= 0) {
            const errorMessage = e.revertReason || e.message || 'Failed to update validator';
            return { error: errorMessage };
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return editValidator(app, password, validatorData, retry + 1);
    }
}

module.exports = {
    editValidator
}
