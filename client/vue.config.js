// vue.config.js
module.exports = {
    devServer: {
        host: 'localhost',
        historyApiFallback: true,
        noInfo: true,
        proxy: {
            '/api' : {
                target: 'http://localhost:9050',
                secure: false
            }
        }
    },
};

process.env.VUE_APP_VERSION = require('./package.json').version;
