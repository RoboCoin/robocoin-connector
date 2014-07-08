'use strict';

module.exports = {
    get: function (config) {

        var Exchange = require('./exchanges/' + config.get('exchangeClass'));
        var instance = Exchange.getInstance(config);
        console.log('instance', instance);
        return instance;
    }
};
