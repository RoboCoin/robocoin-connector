'use strict';

var bigdecimal = require('bigdecimal');
var RobocoinTxTypes = require('../lib/RobocoinTxTypes');

var MockRobocoin = function () {
    this._request = function (options, callback) {};
};

MockRobocoin.prototype._doRequest = function (endpoint, options, method, callback) {
    this._request(options, callback);
};

MockRobocoin.prototype._post = function (endpoints, options, callback) {
    return this._doRequest(endpoints, options, 'POST', callback);
};

MockRobocoin.prototype._get = function (endpoints, options, callback) {
    return this._doRequest(endpoints, options, 'GET', callback);
};

MockRobocoin.prototype._getTimestamp = function () {
    return Math.round((new Date()).getTime() / 1000);
};

MockRobocoin.prototype.getAccountInfo = function (callback) {

    callback(null, {
        depositAddress: '15ukt9EAsbR1LsmUGNyLT1uAokckKXCi1k'
    });
};

MockRobocoin.prototype.getMachineInfo = function (callback) {

    callback(null, [
        { kioskId: '0c0e0761-42cd-4090-95a9-fa8165a86c4b', name: 'Bribe'},
        { kioskId: '3109eed4-d2c9-48bc-8f93-d6143e77a632', name: 'Bellows'}
    ]);
};

MockRobocoin.prototype._getRandomNumber = function (min, max) {
    return Math.floor((Math.random() * (max - min + 1)) + min);
};

MockRobocoin.prototype._getRandomlyGeneratedTransactions = function () {

    var numberOfTransactions = this._getRandomNumber(0, 2);
    var transactions = [];
    var actions = [RobocoinTxTypes.SEND, RobocoinTxTypes.RECV];
    var now = (new Date()).getTime();
    var fiat;
    var xbt;
    var time;
    var rate;
    var action;
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

        if (action == RobocoinTxTypes.SEND) {

            xbt = fiat.divide(rate.multiply(markup), bigdecimal.MathContext.DECIMAL128());
            minersFee = 0.00005;

        } else if (action === RobocoinTxTypes.RECV) {

            xbt = fiat.divide(rate, bigdecimal.MathContext.DECIMAL128()).multiply(markup);
            minersFee = 0.00001;
        }

        fee = xbt.multiply(new bigdecimal.BigDecimal(0.01));
        time = now - this._getRandomNumber(1, 60000);
        var guids = ['2f44a462-cf38-4442-8bc2-1464491c8959', 'd6d70d3a-ee5f-4ac8-b760-4e13f634ce90'];

        transactions.push({
            transactionId: this._getRandomNumber(100, 1000000),
            type: action,
            fiat: fiat.setScale(2, bigdecimal.RoundingMode.DOWN()).toPlainString(),
            currencyType: "USD",
            xbt: xbt.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString(),
            time: time,
            fee: fee.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString(),
            machineId: guids[this._getRandomNumber(0, 1)]
        });
    }

    return transactions;
};

MockRobocoin.prototype.getTransactions = function (since, callback) {
    callback(null, this._getRandomlyGeneratedTransactions());
};

MockRobocoin.prototype.getHashFor = function (robocoinTxId, callback) {

    return callback(null, '98a4df56a1df98a41d65f1a98df1a56d1f98a1df56a1df9a1df');
};

MockRobocoin.prototype.isMock = function () {
    return true;
};

module.exports = MockRobocoin;
