'use strict';

var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var Config = require('../lib/Config');
var config = new Config();
var prompt = require('prompt');




prompt.start();
prompt.get({
    properties: {
        name: {
            description: 'Parameter name'
        },
        value: {
            description: 'Parameter value'
        }
    }
}, function (err, result) {

    if (err) {
        console.error(err);
        return process.exit(1);
    }

    config.set(result.name, result.value);
    configMapper.save(config, function (err) {

        if (err) {
            console.error(err);
            return process.exit(1);
        } else {
            return process.exit(0);
        }
    });
});