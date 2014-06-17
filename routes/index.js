'use strict';

var robocoin = require('../apis/Robocoin').getInstance();
var config = require('../../connectorConfig');
var bitstamp = require('../apis/Exchange').get(config.exchangeClass);
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
        bitstampAccountInfo: function (asyncCallback) {
            bitstamp.getBalance(asyncCallback);
        },
        bitstampAddress: function (asyncCallback) {
            bitstamp.getDepositAddress(asyncCallback);
        }
    }, function (err, asyncRes) {

        if (err) {
            return res.render('accountInfo', {
                robocoinAccount: { xbtBalance: '--' },
                bitstampAccount: {},
                error: err
            });
        }

        asyncRes.bitstampAccountInfo.address = asyncRes.bitstampAddress;

        return res.render('accountInfo', {
            robocoinAccount: asyncRes.robocoinAccountInfo,
            bitstampAccount: asyncRes.bitstampAccountInfo
        });
    });
};

exports.buyAndSell = function (req, res) {
    res.render('buyAndSell');
};