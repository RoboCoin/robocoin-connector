'use strict';

var async = require('async');
var TransactionMapper = require('../data_mappers/TransactionMapper');
var transactionMapper = new TransactionMapper();
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var Robocoin = require('./Robocoin');
var Exchange = require('./Exchange');
var Autoconnector = require('./Autoconnector');
var autoconnector = new Autoconnector();
var Flag = require('../lib/Flag');
var winston = require('winston');

var BatchProcessor = function () {

};

BatchProcessor.prototype.run = function (callback) {

    if (Flag.isSet(Flag.PROCESSING)) {
        winston.info('Already processing, skipping...');
        if (typeof callback != 'undefined') {
            callback();
        }
        return;
    }

    Flag.set(Flag.PROCESSING).on();

    async.waterfall([
        function (waterfallCallback) {
            autoconnector.fetchLatestTransactions(waterfallCallback);
        },
        function (waterfallCallback) {
            transactionMapper.findUnprocessed(waterfallCallback);
        },
        function (unprocessedTransactions, waterfallCallback) {

            configMapper.findAll(function (configErr, config) {
                return waterfallCallback(configErr, config, unprocessedTransactions);
            });
        },
        function (config, unprocessedTransactions, waterfallCallback) {

            Robocoin.getInstance(config).getAccountInfo(function (err, info) {

                if (err) return waterfallCallback(err);

                return waterfallCallback(null, unprocessedTransactions, info.depositAddress);
            });
        },
        function (unprocessedTransactions, depositAddress, waterfallCallback) {

            autoconnector.batchProcess(unprocessedTransactions, depositAddress, waterfallCallback);
        }
    ], function (err) {

        Flag.set(Flag.PROCESSING).off();

        if (err) return console.log('Error in batch processing: ' + err);

        if (callback) return callback();
    });
};

module.exports = BatchProcessor;
