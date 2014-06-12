'use strict';

var robocoin = require('../apis/Robocoin').getInstance();
var TransactionMapper = require('../data_mappers/TransactionMapper');
var transactionMapper = new TransactionMapper();

exports.getTransactions = function (req, res) {

    var sinceDate = new Date(req.body.sinceDate);

    robocoin.getTransactions(sinceDate.getTime(), function (err, transactions) {

        if (err) return res.json(500, {});

        return res.json(transactions);
    });
};

exports.getUnprocessedTransactions = function (req, res) {

    transactionMapper.findUnprocessed(function (err, transactions) {

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