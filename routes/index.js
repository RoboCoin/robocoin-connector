'use strict';

var exports = {};
var robocoin;

exports.transactions = function (req, res) {
    res.render('transactions');
};

exports.accountInfo = function (req, res) {

    var accountInfo = robocoin.getAccountInfo(function (err, accountInfo) {

        if (err) return res.render('accountInfo', { accountInfo: { xbtBalance: '--' } });

        return res.render('accountInfo', { accountInfo: accountInfo });
    });
};

exports.buyAndSell = function (req, res) {
    res.render('buyAndSell');
};

module.exports = function (globalRobocoin) {

    robocoin = globalRobocoin;
    return exports;
};