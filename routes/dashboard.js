'use strict';

var TransactionMapper = require('../data_mappers/TransactionMapper');
var transactionMapper = new TransactionMapper();
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var async = require('async');
var KioskMapper = require('../data_mappers/KioskMapper');
var kioskMapper = new KioskMapper();
var winston = require('winston');

exports.index = function (req, res) {

    configMapper.findAll(function (err, config) {

        if (err) {
            return res.render('dashboardIndex', {
                kioskCurrency: '???',
                kiosks: []
            });
        } else {
            kioskMapper.findAll(function (err, kiosks) {

                if (err) {
                    winston.error('Error getting kiosks: ' + err);
                    kiosks = [];
                }

                return res.render('dashboardIndex', {
                    kioskCurrency: config.get(req.session.kioskId, 'kioskCurrency'),
                    kiosks: kiosks
                });
            });
        }
    });
};

exports.summary = function (req, res) {

    configMapper.findAll(function (err, config) {

        async.parallel({
            profit: function (asyncCallback) {

                transactionMapper.buildProfitReport(req.query.kioskId, function (err, rows) {

                    if (err) return asyncCallback('Error getting profit report: ' + err);

                    var exchangeCurrency = config.get(req.session.kioskId, 'exchangeCurrency');
                    var kioskCurrency = config.get(req.session.kioskId, 'kioskCurrency');
                    if (exchangeCurrency !== '' && exchangeCurrency != kioskCurrency) {
                        // TODO huh?
                    }

                    return asyncCallback(null, rows);
                });
            },
            cashFlow: function (asyncCallback) {

                transactionMapper.buildCashFlowReport(req.query.kioskId, function (err, rows) {

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
