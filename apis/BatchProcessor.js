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

var BatchProcessor = function () {

};

BatchProcessor.prototype.run = function (callback) {

    async.waterfall([
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

                return waterfallCallback(null, config, unprocessedTransactions, info.deposit_address);
            });
        },
        function (config, unprocessedTransactions, depositAddress, waterfallCallback) {

            var exchange = Exchange.get(config);
            autoconnector.batchProcess(unprocessedTransactions, depositAddress, exchange, waterfallCallback);
        }
    ], function (err) {

        if (err) return console.log('Error in batch processing: ' + err);

        if (callback) return callback();

        return console.log('Done batch processing');
    });
};

module.exports = BatchProcessor;
