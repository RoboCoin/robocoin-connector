'use strict';

var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var Config = require('../lib/Config');
var config = new Config();

var paramName = process.argv[2];
var paramValue = process.argv[3];

config.set(paramName, paramValue);
configMapper.save(config, function (err) {

    if (err) {
        console.error(err);
        return process.exit(1);
    } else {
        return process.exit(0);
    }
});
