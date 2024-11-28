const cors = require('cors');

module.exports = {
    setCors: (app, allowedOrigins = ['*']) => {
        app.use(cors({
            origin: function(origin, callback) {
                // allow requests with no origin
                // (like mobile apps or curl requests)
                if (!origin) return callback(null, true);
                if (allowedOrigins.indexOf('*') === -1 && allowedOrigins.indexOf(origin) === -1) {
                    var msg = 'The CORS policy for this site does not ' +
                            'allow access from the specified Origin.';
                    console.log('Origin blocked by CORS policy ', origin);
                    return callback(new Error(msg), false);
                }
                return callback(null, true);
            }
        }));
    }
};