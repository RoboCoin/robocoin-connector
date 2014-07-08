'use strict';

module.exports = {
    get: function (config) {

        console.log('requiring', './exchanges/' + config.get('exchangeClass'));
        var Exchange = require('./exchanges/' + config.get('exchangeClass'));
        console.log('Exchange', Exchange);
        var instance = Exchange.getInstance();
        console.log('instance', instance);
        return Exchange.getInstance(config);
    }
};
