const os = require('os');
const path = require('path');

const action = async (app, environement, action) => {
    return path.join(os.homedir(), '.heliades');
}

module.exports = {
    action
}