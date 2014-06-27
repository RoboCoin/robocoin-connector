'use strict';

var Robocoin = require('../apis/Robocoin');
var Exchange = require('../apis/Exchange');
var async = require('async');
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();

exports.transactions = function (req, res) {
    res.render('transactions');
};

exports.accountInfo = function (req, res) {

    configMapper.findAll(function (configErr, config) {

        if (configErr) return res.send(configErr);

        var exchange = Exchange.get(config);
        // must be series because of the bitstamp nonce
        async.series({
            robocoinAccountInfo: function (asyncCallback) {

                Robocoin.getInstance(config).getAccountInfo(asyncCallback);
            },
            exchangeAccountInfo: function (asyncCallback) {
                exchange.getBalance(asyncCallback);
            },
            exchangeAddress: function (asyncCallback) {
                exchange.getDepositAddress(asyncCallback);
            }
        }, function (err, asyncRes) {

            if (err) {
                return res.render('accountInfo', {
                    robocoinAccount: { xbt_balance: '--' },
                    exchangeAccount: {},
                    error: err
                });
            }

            asyncRes.exchangeAccountInfo.address = asyncRes.exchangeAddress;

            return res.render('accountInfo', {
                robocoinAccount: asyncRes.robocoinAccountInfo,
                exchangeAccount: asyncRes.exchangeAccountInfo
            });
        });
    });
};

exports.buyAndSell = function (req, res) {
    res.render('buyAndSell');
};