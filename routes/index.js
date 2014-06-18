'use strict';

var robocoin = require('../apis/Robocoin').getInstance();
var config = require('../../connectorConfig');
var exchange = require('../apis/Exchange').get(config.exchangeClass);
var async = require('async');

exports.transactions = function (req, res) {
    res.render('transactions');
};

exports.accountInfo = function (req, res) {

    // must be series because of the bitstamp nonce
    async.series({
        robocoinAccountInfo: function (asyncCallback) {
            robocoin.getAccountInfo(asyncCallback);
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
};

exports.buyAndSell = function (req, res) {
    res.render('buyAndSell');
};