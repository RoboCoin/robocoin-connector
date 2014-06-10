'use strict';

var Robocoin = function (key, secret) {

};

Robocoin.prototype.getAccountInfo = function (callback) {

    callback(null, {
        xbtBalance: 5.89451,
        depositAddress: '15ukt9EAsbR1LsmUGNyLT1uAokckKXCi1k'
    });
};

Robocoin.prototype.getTransactions = function (callback) {

    var transactions = require('../test/apis/robocoinTransactions');

    callback(null, transactions);
};

module.exports = function (key, secret) {
    return new Robocoin(key, secret);
};
