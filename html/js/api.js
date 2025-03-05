
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