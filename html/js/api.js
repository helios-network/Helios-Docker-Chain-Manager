
const isSetup = async () => {
    const response = await fetch('/is-setup', {
            method: 'GET',
            headers: {
                'Access-Code': password,
                'Content-Type': 'application/json'
            }
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
    const response = await fetch('/get-validator', {
            method: 'POST',
            headers: {
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