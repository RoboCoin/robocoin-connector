'use strict';

var bigdecimal = require('bigdecimal');

var MockRobocoin = function () {
};

MockRobocoin.prototype._getTimestamp = function () {
    return Math.round((new Date()).getTime() / 1000);
};

MockRobocoin.prototype.getAccountInfo = function (callback) {

    callback(null, {
        xbt_balance: 5.89451,
        deposit_address: '15ukt9EAsbR1LsmUGNyLT1uAokckKXCi1k'
    });
};

MockRobocoin.prototype.getMachineInfo = function (callback) {

    callback(null, [
        { id: '680ec3d2-cc5a-4d8b-b1b0-3aa4dfc98e23', name: 'Bribe'},
        { id: '5ae35439-663a-497c-a28d-b1c82312ea52', name: 'Bellows'}
    ]);
};

MockRobocoin.prototype._getRandomNumber = function (min, max) {
    return Math.floor((Math.random() * (max - min + 1)) + min);
};

MockRobocoin.prototype._getRandomlyGeneratedTransactions = function () {

    var numberOfTransactions = this._getRandomNumber(0, 2);
    var transactions = [];
    var actions = ['send', 'forward'];
    var now = (new Date()).getTime();
    var fiat;
    var xbt;
    var time;
    var rate;
    var action;
    var confirmations;
    var fee;
    var markup = new bigdecimal.BigDecimal(1.05);
    var minersFee;

    for (var i = 0; i < numberOfTransactions; i++) {

        action = actions[this._getRandomNumber(0, 1)];
        // how much fiat they put in or get out
        // one in ten times, it's a small amount
        fiat = new bigdecimal.BigDecimal((this._getRandomNumber(1, 10) == 1) ? 5 : this._getRandomNumber(6, 8));
        // BTC price, between $615 and $625
        rate = new bigdecimal.BigDecimal(this._getRandomNumber(619, 621));

        confirmations = null;

        if (action == 'send') {

            xbt = fiat.divide(rate.multiply(markup), bigdecimal.MathContext.DECIMAL128());
            minersFee = 0.00005;

        } else if (action === 'forward') {

            confirmations = this._getRandomNumber(0, 12);
            xbt = fiat.divide(rate, bigdecimal.MathContext.DECIMAL128()).multiply(markup);
            minersFee = 0.00001;
        }

        fee = xbt.multiply(new bigdecimal.BigDecimal(0.01));
        time = now - this._getRandomNumber(1, 60000);
        var guids = ['680ec3d2-cc5a-4d8b-b1b0-3aa4dfc98e23', '5ae35439-663a-497c-a28d-b1c82312ea52'];

        transactions.push({
            id: this._getRandomNumber(100, 1000000),
            action: action,
            fiat: fiat.setScale(2, bigdecimal.RoundingMode.DOWN()).toPlainString(),
            currency: "USD",
            xbt: xbt.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString(),
            time: time,
            confirmations: confirmations,
            fee: fee.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString(),
            miners_fee: minersFee,
            machine_id: guids[this._getRandomNumber(0, 1)]
        });
    }

    return transactions;
};

MockRobocoin.prototype.getTransactions = function (since, callback) {
    callback(null, this._getRandomlyGeneratedTransactions());
};

MockRobocoin.prototype.isMock = function () {
    return true;
};

module.exports = MockRobocoin;
