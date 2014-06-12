'use strict';

var config = require('../../connectorConfig');
var bigdecimal = require('bigdecimal');

var Robocoin = function (options) {

};

Robocoin.prototype.getAccountInfo = function (callback) {

    callback(null, {
        xbtBalance: 5.89451,
        depositAddress: '15ukt9EAsbR1LsmUGNyLT1uAokckKXCi1k'
    });
};

Robocoin.prototype._getRandomNumber = function (min, max) {
    return Math.floor((Math.random() * (max - min + 1)) + min);
};

Robocoin.prototype._getRandomlyGeneratedTransactions = function () {

    var numberOfTransactions = this._getRandomNumber(0, 3);
    var transactions = [];
    var actions = ['send', 'receive', 'forward'];
    var now = (new Date()).getTime();
    var fiat;
    var xbt;
    var time;
    var rate;
    var action;
    var confirmations;
    var fee;

    for (var i = 0; i < numberOfTransactions; i++) {

        xbt = new bigdecimal.BigDecimal(this._getRandomNumber(9, 10) / 1000);
        rate = new bigdecimal.BigDecimal(this._getRandomNumber(615, 640));
        fiat = xbt.multiply(rate);
        action = actions[this._getRandomNumber(0, 2)];
        confirmations = null;
        fee = xbt.multiply(new bigdecimal.BigDecimal(0.01));

        if (action === 'forward') {
            confirmations = this._getRandomNumber(0, 12);
        }

        time = now - this._getRandomNumber(1, 60000);

        transactions.push({
            id: this._getRandomNumber(100, 1000000),
            action: action,
            fiat: fiat.setScale(2, bigdecimal.RoundingMode.DOWN()).toPlainString(),
            xbt: xbt.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString(),
            time: time,
            confirmations: confirmations,
            fee: fee.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString()
        });
    }

    return transactions;
};

Robocoin.prototype.getTransactions = function (since, callback) {

    var transactions;

    if (config.robocoin.testMode && config.robocoin.testMode == 'random') {
        transactions = this._getRandomlyGeneratedTransactions();
    } else if (config.robocoin.testMode && config.robocoin.testMode == 'static') {
        transactions = require('../test/apis/robocoinTransactions');
    }

    callback(null, transactions);
};

var robocoin = null;

module.exports = {
    getInstance: function () {

        if (robocoin === null) {
            robocoin = new Robocoin(config.robocoin);
        }

        return robocoin;
    }
};
