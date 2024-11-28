
const getExternalIP = require('external-ip')({
    replace: true,
    services: [
        'http://ifconfig.me/ip',
        'http://icanhazip.com/',
        'http://ident.me/',
        'https://api.ipify.org/',
        'http://checkip.dyndns.org/',
        'http://ipinfo.io/ip',
        'http://myexternalip.com/raw',
        'http://ip.42.pl/raw'
    ]
});

module.exports = {
    getIp: async () => {
        return await new Promise((resolve) => {
            getExternalIP((err, ip) => {
                if (err) {
                  console.error('Erreur :', err);
                  resolve(undefined);
                } else {
                  resolve(ip);
                }
            });
        });
    }
};