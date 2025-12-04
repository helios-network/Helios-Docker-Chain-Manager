const isSetup = async () => {
    const response = await fetch('/is-setup', {
            method: 'POST',
            headers: {
                'Access-Code': password,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
    const isSetup = await response.text();

    if (isSetup === 'true') {
        return true;
    }
    return false;
};

const apiTestPassword = async (password) => {
    const response = await fetch('/auth-try', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: encodePasswordPayload(password)
            })
        });
    const is = await response.text();

    if (is === 'true') {
        return true;
    }
    return false;
}

const apiSetPassword = async (password) => {
    const response = await fetch('/auth-subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: encodePasswordPayload(password)
            })
        });
    const is = await response.text();

    if (is === 'true') {
        return true;
    }
    return false;
}

const apiGetNodeMoniker = async () => {
    try {
        const response = await fetch('/node-moniker', {
            method: 'GET',
            headers: {
                'Access-Code': password
            }
        });

        if (!response.ok) {
            return undefined;
        }

        const result = await response.json();

        if (!result || result.success === false) {
            return undefined;
        }

        return result;
    } catch (error) {
        console.error('Failed to fetch node moniker:', error);
        return undefined;
    }
};

const apiGetValidatorAndHisAssetsAndCommission = async () => {
    const response = await fetch('/call-rpc', {
            method: 'POST',
            headers: {
                'Access-Code': password,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: 'eth_getValidatorWithHisAssetsAndCommission',
                params: ['$address']
            })
        });
    const result = await response.json();

    if (result === false) {
        return undefined;
    }
    return result;
}

const apiGetDelegations = async (delegatorAddress) => {
    const response = await fetch('/call-rpc', {
        method: 'POST',
        headers: {
            'Access-Code': password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            method: 'eth_getDelegations',
            params: [delegatorAddress]
        })
    });
    const result = await response.json();
    return result;
}

const apiGetTokenDetails = async (contractAddress) => {
    const response = await fetch('/call-rpc', {
        method: 'POST',
        headers: {
            'Access-Code': password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            method: 'eth_getTokenDetails',
            params: [contractAddress]
        })
    });
    const result = await response.json();
    return result;
}

const apiValidatorClaim = async (walletPassword) => {
    const response = await fetch('/validator-claim', {
        method: 'POST',
        headers: {
            'Access-Code': password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            password: btoa(rot13(walletPassword))
        })
    });
    const result = await response.json();

    if (result === false) {
        return undefined;
    }
    return result;
}

const apiValidatorClaimCommission = async (walletPassword) => {
    const response = await fetch('/validator-claim-commission', {
        method: 'POST',
        headers: {
            'Access-Code': password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            password: btoa(rot13(walletPassword))
        })
    });
    const result = await response.json();

    if (result === false) {
        return undefined;
    }
    return result;
}

const apiValidatorCreate = async (walletPassword, validatorData) => {
    const response = await fetch('/validator-create', {
        method: 'POST',
        headers: {
            'Access-Code': password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            password: btoa(rot13(walletPassword)),
            validatorData: validatorData
        })
    });
    const result = await response.json();

    if (result === false) {
        return undefined;
    }
    return result;
}

const apiValidatorEdit = async (walletPassword, validatorData) => {
    const response = await fetch('/validator-edit', {
        method: 'POST',
        headers: {
            'Access-Code': password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            password: btoa(rot13(walletPassword)),
            validatorData: validatorData
        })
    });
    const result = await response.json();

    if (!response.ok) {
        return result;
    }

    if (result === false) {
        return undefined;
    }
    return result;
}

const apiValidatorUnjail = async (walletPassword) => {
    const response = await fetch('/action', {
        method: 'POST',
        headers: {
            'Access-Code': password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: "unjailNode",
            walletPassword: walletPassword
        })
    });
    const result = await response.json();

    if (result === false) {
        return undefined;
    }
    return result;
}

const apiAddPeer = async (peerAddress) => {
    const response = await fetch('/action', {
        method: 'POST',
        headers: {
            'Access-Code': password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: "addPeer",
            peerAddress: peerAddress
        })
    });
    const result = await response.json();

    if (result === false) {
        return undefined;
    }
    return result;
}

const apiGetWalletInfo = async () => {
    const response = await fetch('/fetch-wallet', {
        method: 'POST',
        headers: {
            'Access-Code': password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });
    const result = await response.json();

    if (result === false) {
        return undefined;
    }
    return result;
}

const apiWalletTransfer = async (walletPassword, walletData) => {
    const response = await fetch('/wallet-transfer', {
        method: 'POST',
        headers: {
            'Access-Code': password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            password: btoa(rot13(walletPassword)),
            walletData: walletData
        })
    });
    return await response.json();
}

const apiPost = async (url, data) => {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Access-Code': password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    return await response.json();
}

const apiDownloadBackup = async (filename) => {    
    const response = await fetch(`/backup-download/${encodeURIComponent(filename)}`, {
        method: 'GET',
        headers: {
            'Access-Code': password
        }
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.blob();
}
