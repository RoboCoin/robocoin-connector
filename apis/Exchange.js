'use strict';

module.exports = {
    get: function (config) {

        if (!config.exchangeClass) {
            console.log(config);
            throw { message: 'Exchange not configured!', code: 'EXCHANGE_NOT_CONFIGURED' };
        }

        return require('./exchanges/' + config.exchangeClass)
            .getInstance(config);
    }
};
