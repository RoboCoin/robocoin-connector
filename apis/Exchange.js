'use strict';

module.exports = {
    get: function (config) {

        if (!config.exchangeClass) {
            throw 'Exchange not configured!';
        }
        console.log('getting exchange with config:', config);
        return require('./exchanges/' + config.exchangeClass)
            .getInstance(config);
    }
};
