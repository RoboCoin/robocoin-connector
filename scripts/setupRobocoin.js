'use strict';

var async = require('async');
var Config = require('../lib/Config');
var config = Config.getInstance();
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var prompt = require('prompt');

config.set(null, 'robocoin.baseUrl', 'https://api.robocoin.com/v0/connector');
config.set(null, 'robocoin.testMode', 0);

prompt.get({
    properties: {
        robocoinKey: {
            description: 'Robocoin API key'
        },
        robocoinSecret: {
            description: 'Robocoin API secret'
        }
    }
}, function (err, result) {

    if (err) {
        console.error(err);
        return process.exit(1);
    }

    config.set(null, 'robocoin.key', result.robocoinKey);
    config.set(null, 'robocoin.secret', result.robocoinSecret);
    configMapper.save(null, config, function (err) {

        if (err) {
            console.error(err);
            return process.exit(1);
        } else {
            return process.exit(0);
        }
    });
});
