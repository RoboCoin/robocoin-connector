'use strict';

module.exports = {
    get: function (config) {

        if (!config.exchangeClass) {
            throw 'Exchange not configured!';
        }

        return require('./exchanges/' + config.exchangeClass)
            .getInstance(config);
    }
};
