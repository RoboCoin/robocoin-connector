'use strict';

var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var Robocoin = require('../apis/Robocoin');
var KioskMapper = require('../data_mappers/KioskMapper');
var kioskMapper = new KioskMapper();
var async = require('async');

configMapper.findAll(function (err, config) {

    if (err) {
        console.log('Error getting config: ' + err);
        process.exit(1);
    }

    Robocoin.getInstance(config).getMachineInfo(function (err, machines) {

        console.log('err ' + err);console.log('machines ' + machines);
        if (err) {
            console.log('Error getting machine info: ' + err);
            process.exit(1);
        }

        async.each(machines, function (machine, asyncCallback) {

            kioskMapper.save({
                id: machine.id,
                name: machine.name
            }, asyncCallback);

        }, function (err) {

            if (err) {
                console.log(err);
                process.exit(1);
            }

            process.exit(0);
        });
    });
});
