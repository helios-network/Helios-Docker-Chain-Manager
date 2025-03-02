
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
