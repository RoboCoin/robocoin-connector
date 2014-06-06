'use strict';

var exports = {};
var robocoin;
var bitstamp;
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

module.exports = function (globalRobocoin, globalBitstamp) {

    robocoin = globalRobocoin;
    bitstamp = globalBitstamp;
    return exports;
};