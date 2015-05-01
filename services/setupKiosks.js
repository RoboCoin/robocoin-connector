'use strict';

var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var Robocoin = require('../apis/Robocoin');
var KioskMapper = require('../data_mappers/KioskMapper');
var kioskMapper = new KioskMapper();
var async = require('async');

module.exports = {
    initialize: function (callback) {

        configMapper.findAll(function (err, config) {

            if (err) return callback('Error getting config: ' + err);

            Robocoin.getInstance(config).getMachineInfo(function (err, machines) {

                if (err) return callback('Error getting machine info: ' + err);

                async.each(machines, function (machine, asyncCallback) {

                    kioskMapper.save({
                        id: machine.id,
                        name: machine.name
                    }, asyncCallback);

                }, function (err) {

                    if (err) return callback(err);

                    return callback();
                });
            });
        });
    }
};
