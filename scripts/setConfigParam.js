'use strict';

var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var Config = require('../lib/Config');
var config = Config.getInstance();
var prompt = require('prompt');




prompt.start();
prompt.get({
    properties: {
        kioskId: {
            description: 'Kiosk ID'
        },
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

    config.set(result.kioskId, result.name, result.value);
    configMapper.save(result.kioskId, config, function (err) {

        if (err) {
            console.error(err);
            return process.exit(1);
        } else {
            return process.exit(0);
        }
    });
});