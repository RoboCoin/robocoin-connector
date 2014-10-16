'use strict';

var TransactionMapper = require('../data_mappers/TransactionMapper');
var transactionMapper = new TransactionMapper();
var Autoconnector = require('../apis/Autoconnector');
var autoconnector = new Autoconnector();
var Robocoin = require('../apis/Robocoin');
var async = require('async');
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var Exchange = require('../apis/Exchange');

exports.index = function (req, res) {

    var ordersToProcess = req.body.orders.split(',');

    async.waterfall([
        function (asyncCallback) {

            transactionMapper.findAllByIds(ordersToProcess, asyncCallback);
        },
        function (transactions, asyncCallback) {

            configMapper.findAll(function (err, config) {
                return asyncCallback(err, config, transactions);
            });
        },
        function (config, transactions, asyncCallback) {

            var robocoin = Robocoin.getInstance(config);
            robocoin.getAccountInfo(function (err, info) {

                if (err) return asyncCallback(err);

                return asyncCallback(null, transactions, info.depositAddress, config);
            });
        },
        function (transactions, depositAddress, config, asyncCallback) {

            var exchange = Exchange.get(config);

            autoconnector.batchProcess(transactions, depositAddress, exchange, asyncCallback);
        }
    ], function (err, transactionsProcessed) {

        if (typeof transactionsProcessed === 'undefined') {
            transactionsProcessed = [];
        }

        if (err) return res.send({
            message: 'Error processing transactions: ' + err,
            transactions: []
        });

        return res.send({
            message: 'Processed transactions: ' + transactionsProcessed.join(', '),
            transactions: transactionsProcessed
        });
    });
};
