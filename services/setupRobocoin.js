'use strict';

var Config = require('../lib/Config');
var config = Config.getInstance();
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();

module.exports = {
    initialize: function (key, secret, callback) {

        config.set(null, 'robocoin.baseUrl', 'https://api.romit.io/v0/connector');
        config.set(null, 'robocoin.testMode', 0);
        config.set(null, 'robocoin.key', key);
        config.set(null, 'robocoin.secret', secret);

        configMapper.save(null, config, function (err) {

            if (err) return callback('Error saving Romit config: ' + err);
            return callback();
        });
    }
};
