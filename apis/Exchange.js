'use strict';

module.exports = {
    get: function (config) {

        return require('./exchanges/' + config.get('exchangeClass'))
            .getInstance(
                config.getParamsByPrefix(
                    config.get('exchangeClass').charAt(0).toLowerCase() + config.get('exchangeClass').slice(1)
                )
            );
    }
};
