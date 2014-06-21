'use strict';

var TransactionMapper = require('../data_mappers/TransactionMapper');
var transactionMapper = new TransactionMapper();
var async = require('async');

exports.index = function (req, res) {
    res.render('dashboardIndex');
};

exports.summary = function (req, res) {

    async.parallel({
        profit: function (asyncCallback) {

            transactionMapper.buildProfitReport(function (err, rows) {

                if (err) return asyncCallback('Error getting profit report: ' + err);

                return asyncCallback(null, rows);
            });
        },
        cashFlow: function (asyncCallback) {

            transactionMapper.buildCashFlowReport(function (err, rows) {

                if (err) return asyncCallback('Error getting cash flow report: ' + err);

                return asyncCallback(null, rows);
            });
        }
    }, function (err, results) {

        if (err) return res.send(500, err);

        return res.json({
            profit: results.profit,
            cashFlow: results.cashFlow
        });
    });
};
