// vue.config.js
module.exports = {
    devServer: {
        historyApiFallback: true,
        noInfo: true,
        proxy: {
            '/api' : {
                target: 'http://localhost:9050',
                secure: false
            }
        }
    },
}
