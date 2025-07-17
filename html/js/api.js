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
                password: password
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
                password: password
            })
        });
    const is = await response.text();

    if (is === 'true') {
        return true;
    }
    return false;
}

const apiGetValidatorAndHisDelegation = async () => {
    const response = await fetch('/call-rpc', {
            method: 'POST',
            headers: {
                'Access-Code': password,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: 'eth_getValidatorWithHisDelegationAndCommission',
                params: ['$address']
            })
        });
    const result = await response.json();

    if (result === false) {
        return undefined;
    }
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
    const result = await response.text();

    if (result === false) {
        return undefined;
    }
    return result;
}