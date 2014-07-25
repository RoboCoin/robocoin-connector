'use strict';

var winston = require('winston');

module.exports = {
    get: function (config) {

        if (!config.exchangeClass) {
            winston.error('Exchange not configured!');
        }

        return require('./exchanges/' + config.exchangeClass)
            .getInstance(config);
    }
};
