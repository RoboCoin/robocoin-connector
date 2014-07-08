'use strict';

module.exports = {
    get: function (config) {

        return require('./exchanges/' + config.get('exchangeClass'))
            .getInstance(config);
    }
};
