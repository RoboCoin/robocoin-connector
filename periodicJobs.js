'use strict';

var Autoconnector = require('./apis/Autoconnector');
var TransactionMapper = require('./data_mappers/TransactionMapper');
var async = require('async');
var robocoin = require('./apis/Robocoin').getInstance();

var autoconnector = new Autoconnector();
var transactionMapper = new TransactionMapper();

var AUTOCONNECTOR_INTERVAL = 60000;

var autoconnectorRunErrorHandler = function (err) {
    if (err) return console.log('Autoconnector run error: ' + err);
};

var batchProcess = function () {

    async.waterfall([
        function (waterfallCallback) {
            transactionMapper.findUnprocessed(waterfallCallback);
        },
        function (unprocessedTransactions, waterfallCallback) {
            robocoin.getAccountInfo(function (err, info) {

                if (err) return waterfallCallback(err);

                return waterfallCallback(null, unprocessedTransactions, info.depositAddress);
            });
        },
        function (unprocessedTransactions, depositAddress, waterfallCallback) {
            autoconnector.batchProcess(unprocessedTransactions, depositAddress, waterfallCallback);
        }
    ], function (err) {

        if (err) return console.log('Error in batch processing: ' + err);

        return console.log('Done batch processing');
    });
};

setInterval(function () {

    var randomNumber = (Math.random() * 10);

    // nine in ten times, run the autoconnector
    if (randomNumber > 1) {
        autoconnector.run(autoconnectorRunErrorHandler);
    } else {
        // but one in ten, do the batch rollup
        batchProcess();
    }

}, AUTOCONNECTOR_INTERVAL);
autoconnector.run(autoconnectorRunErrorHandler);
console.log('Autoconnector running');
