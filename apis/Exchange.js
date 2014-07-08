'use strict';

module.exports = {
    get: function (config) {

        console.log('requiring', './exchanges/' + config.get('exchangeClass'));
        var Exchange = require('./exchanges/' + config.get('exchangeClass'));
        console.log(Exchange);
        return Exchange.getInstance(config);
    }
};
