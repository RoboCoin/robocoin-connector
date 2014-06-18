'use strict';

var Autoconnector = require('./apis/Autoconnector');
var TransactionMapper = require('./data_mappers/TransactionMapper');
var async = require('async');
var robocoin = require('./apis/Robocoin').getInstance();

var autoconnector = new Autoconnector();
var transactionMapper = new TransactionMapper();

var autoconnectorRunErrorHandler = function (err) {
    if (err) return console.log('Autoconnector run error: ' + err);
};

exports.batchProcess = function (callback) {

    async.waterfall([
        function (waterfallCallback) {
            transactionMapper.findUnprocessed(waterfallCallback);
        },
        function (unprocessedTransactions, waterfallCallback) {
            robocoin.getAccountInfo(function (err, info) {

                if (err) return waterfallCallback(err);

                return waterfallCallback(null, unprocessedTransactions, info.deposit_address);
            });
        },
        function (unprocessedTransactions, depositAddress, waterfallCallback) {
            autoconnector.batchProcess(unprocessedTransactions, depositAddress, waterfallCallback);
        }
    ], function (err) {

        if (err) return console.log('Error in batch processing: ' + err);

        if (callback) return callback();

        return console.log('Done batch processing');
    });
};

exports.runAutoconnector = function (errorHandler) {

    if (!errorHandler) {
        errorHandler = autoconnectorRunErrorHandler;
    }

    autoconnector.run(errorHandler);
};
