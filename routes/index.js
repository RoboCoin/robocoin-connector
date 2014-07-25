'use strict';

var Robocoin = require('../apis/Robocoin');
var Exchange = require('../apis/Exchange');
var async = require('async');
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var KioskMapper = require('../data_mappers/KioskMapper');
var kioskMapper = new KioskMapper();
var winston = require('winston');

exports.transactions = function (req, res) {

    kioskMapper.findAll(function (err, kiosks) {

        if (err) winston.error(err);

        return res.render('transactions', {
            csrfToken: req.csrfToken(),
            kiosks: kiosks
        });
    });
};

exports.accountInfo = function (req, res) {

    configMapper.findAll(function (configErr, config) {

        if (configErr) return res.send(configErr);

        var exchange = Exchange.get(config.getAllForKiosk(req.session.kioskId));
        // must be series because of the bitstamp nonce
        async.series({
            robocoinAccountInfo: function (asyncCallback) {

                Robocoin.getInstance(config).getAccountInfo(asyncCallback);
            }
        }, function (err, asyncRes) {

            if (err) {
                return res.render('accountInfo', {
                    robocoinAccount: { xbt_balance: '--' },
                    error: err
                });
            }

            kioskMapper.findAll(function (err, kiosks) {

                if (err) winston.error('Error getting kiosks: ' + err);

                return res.render('accountInfo', {
                    robocoinAccount: asyncRes.robocoinAccountInfo,
                    kiosks: kiosks
                });
            });
        });
    });
};

exports.buyAndSell = function (req, res) {

    configMapper.findAll(function (err, config) {

        var exchangeCurrency = '???';

        if (!err) exchangeCurrency = config.get(req.session.kioskId, 'exchangeCurrency');

        kioskMapper.findAll(function (err, kiosks) {

            if (err) winston.error('Error getting kiosks: ' + err);

            res.render('buyAndSell', {
                csrfToken: req.csrfToken(),
                exchangeCurrency: exchangeCurrency,
                kiosks: kiosks
            });
        });
    });
};