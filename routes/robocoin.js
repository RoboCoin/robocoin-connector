'use strict';

var exports = {};
var robocoin;

exports.getTransactions = function (req, res) {

    robocoin.getTransactions(function (err, transactions) {

        if (err) return res.json(500, {});

        return res.json(transactions);
    });
};

module.exports = function (globalRobocoin) {

    robocoin = globalRobocoin;
    return exports;
};