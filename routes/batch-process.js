'use strict';

var TransactionMapper = require('../data_mappers/TransactionMapper');
var transactionMapper = new TransactionMapper();
var Autoconnector = require('../apis/Autoconnector');
var autoconnector = new Autoconnector();
var robocoin = require('../apis/Robocoin').getInstance();
var async = require('async');

exports.index = function (req, res) {

    var ordersToProcess = req.body.orders.split(',');

    async.waterfall([
        function (asyncCallback) {

            transactionMapper.findAllByIds(ordersToProcess, asyncCallback);
        },
        function (transactions, asyncCallback) {

            robocoin.getAccountInfo(function (err, info) {

                if (err) return asyncCallback(err);

                return asyncCallback(null, transactions, info.depositAddress);
            });
        },
        function (transactions, depositAddress, asyncCallback) {

            autoconnector.batchProcess(transactions, depositAddress, asyncCallback);
        }
    ], function (err) {

        if (err) return res.send('Error processing transactions: ' + err);

        return res.send('Processed orders: ' + ordersToProcess);
    });
};
