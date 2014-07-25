'use strict';

var Robocoin = require('../apis/Robocoin');
var TransactionMapper = require('../data_mappers/TransactionMapper');
var transactionMapper = new TransactionMapper();
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var winston = require('winston');

exports.getTransactions = function (req, res) {

    var sinceDate = new Date(req.body.sinceDate);

    configMapper.findAll(function (configErr, config) {

        if (configErr) {
            winston.error('Error finding config: ' + configErr);
            return res.json(500, {});
        }

        Robocoin.getInstance(config).getTransactions(sinceDate.getTime(), function (err, transactions) {

            if (err) return res.json(500, {});

            return res.json(transactions);
        });
    });
};

exports.getUnprocessedTransactions = function (req, res) {

    transactionMapper.findUnprocessedForKiosk(req.query.kioskId, function (err, transactions) {

        if (err) return res.send(err);

        var outputTransactions = [];
        var transaction;

        for (var i = 0; i < transactions.length; i++) {

            transaction = transactions[i];

            outputTransactions.push({
                id: transaction.robocoin_tx_id,
                action: transaction.robocoin_tx_type,
                fiat: transaction.robocoin_fiat,
                xbt: transaction.robocoin_xbt,
                fee: transaction.robocoin_tx_fee,
                confirmations: transaction.confirmations,
                time: transaction.robocoin_tx_time
            });
        }

        return res.send(outputTransactions);
    });
};

exports.getProcessedTransactions = function (req, res) {

    transactionMapper.findProcessedForKiosk(req.query.kioskId, function (err, transactions) {

        if (err) return res.send(err);

        return res.send(transactions);
    });
};