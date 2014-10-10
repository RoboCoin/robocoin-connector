'use strict';

var Robocoin = require('../apis/Robocoin');
var TransactionMapper = require('../data_mappers/TransactionMapper');
var transactionMapper = new TransactionMapper();
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var winston = require('winston');
var async = require('async');

exports.getTransactions = function (req, res) {

    var sinceDate = new Date(req.body.sinceDate);

    configMapper.findAll(function (configErr, config) {

        if (configErr) {
            winston.error('Error finding config: ' + configErr);
            return res.json(500, {});
        }

        Robocoin.getInstance(config).getTransactions(sinceDate.getTime(), function (err, transactions) {

            if (err) {
                winston.error('Error getting transactions: ' + err);
                return res.json(500, {});
            }

            return res.json(transactions);
        });
    });
};

exports.importTransactions = function (req, res) {

    var sinceDate = new Date(req.body.sinceDate);

    configMapper.findAll(function (configErr, config) {

        if (configErr) {
            winston.error('Error finding config: ' + configErr);
            return res.status(500).json({ err: configErr });
        }

        Robocoin.getInstance(config).getTransactions(sinceDate.getTime(), function (err, transactions) {

            if (err) {
                winston.error('Error getting transactions: ' + err);
                return res.status(500).json({ err: err });
            }

            async.eachSeries(transactions, function (transaction, callback) {
                transactionMapper.save(transaction, callback);
            }, function (err) {

                if (err) return res.status(500).json({ err: err });
                return res.send('Success!');
            });
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

exports.getTransactionHash = function (req, res) {

    configMapper.findAll(function (configErr, config) {

        if (configErr) {
            winston.error('Error finding config: ' + configErr);
            return res.json(500, {});
        }

        Robocoin.getInstance(config).getHashFor(req.query.robocoinTxId, function (err, hash) {

            if (err) return res.json(500, {});

            return res.json(hash);
        });
    });
};