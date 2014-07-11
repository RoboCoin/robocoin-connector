'use strict';

var TransactionMapper = require('../data_mappers/TransactionMapper');
var transactionMapper = new TransactionMapper();
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var async = require('async');

exports.index = function (req, res) {

    configMapper.findAll(function (err, config) {

        if (err) {
            return res.render('dashboardIndex', {
                kioskCurrency: '???'
            });
        } else {
            return res.render('dashboardIndex', {
                kioskCurrency: config.get('kioskCurrency')
            });
        }
    });
};

exports.summary = function (req, res) {

    configMapper.findAll(function (err, config) {
        async.parallel({
            profit: function (asyncCallback) {

                transactionMapper.buildProfitReport(function (err, rows) {

                    if (err) return asyncCallback('Error getting profit report: ' + err);

                    var exchangeCurrency = config.get('exchangeCurrency');
                    var kioskCurrency = config.get('kioskCurrency');
                    if (exchangeCurrency !== '' && exchangeCurrency != kioskCurrency) {

                    }

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
    });
};
