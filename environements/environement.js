const fs = require('fs');

module.exports = {
    load: () => {
        var argv = require('minimist')(process.argv.slice(2));

        const args = argv;


        if (['c'].find(key => Object.keys(args).includes(key)) === undefined || Object.keys(args).includes('help') || Object.keys(args).includes('h')) {
            console.log(`[Helios Node - API] - help:\n -c <env> (testnet,mainnet)`);
            process.exit(0);
        }

        const envVar = args['c'];

        let environement = undefined;
        try {
            environement = fs.readFileSync(`./environements/${envVar}.json`);
            console.log(`[Helios Node - API] - Environement ${envVar} loaded`);
        } catch (e) {
            console.log(`[Helios Node - API] - Environement ${envVar} not found`);
            process.exit(0);
        }
        return {
            ... JSON.parse(environement),
            ... args,
            env: process.env
        };
    }
};