'use strict';

module.exports = {
    get: function (config) {

        if (!config.exchangeClass) {
            throw { message: 'Exchange not configured!', code: 'EXCHANGE_NOT_CONFIGURED' };
        }

        return require('./exchanges/' + config.exchangeClass)
            .getInstance(config);
    }
};
