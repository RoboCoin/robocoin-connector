'use strict';

var config = require('../../connectorConfig');
var bigdecimal = require('bigdecimal');
var request = require('request');
var crypto = require('crypto');

var Robocoin = function (options) {

    this._mode = 'production';
    this._baseUrl = options.baseUrl;
    this._apiKey = options.key;
    this._apiSecret = options.secret;

    if (config.robocoin.testMode && config.robocoin.testMode == 'random') {
        this._mode = 'random';
    } else if (config.robocoin.testMode && config.robocoin.testMode == 'static') {
        this._mode = 'static';
    }
};

Robocoin.prototype._request = request;

Robocoin.prototype._getNonce = function () {
    return (new Date()).getTime();
};

Robocoin.prototype._post = function (endpoint, options, callback) {

    options.nonce = this._getNonce();

    var hmac = crypto.createHmac('sha256', this._apiSecret);
    hmac.update(JSON.stringify(options));

    var requestOptions = {
        url: this._baseUrl + endpoint,
        form: options,
        method: 'POST',
        json: true,
        headers: {
            'X-API-key': this._apiKey,
            'X-API-signature': hmac.digest('hex')
        }
    };

    this._request(requestOptions, function (error, response, body) {

        return callback(error, body);
    });
};

/**
 * Used for loading the database.
 *
 * @param mode
 */
Robocoin.prototype.setMode = function (mode) {
    this._mode = mode;
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
        fiat = new bigdecimal.BigDecimal(this._getRandomNumber(4, 7));
        // BTC price, between $615 and $625
        rate = new bigdecimal.BigDecimal(this._getRandomNumber(615, 625));

        confirmations = null;

        if (action == 'send') {

            xbt = fiat.divide(rate.multiply(markup), bigdecimal.MathContext.DECIMAL128());
            minersFee = 0.00005;

        } else if (action === 'forward') {

            confirmations = this._getRandomNumber(0, 12);
            xbt = fiat.divide(rate, bigdecimal.MathContext.DECIMAL128()).multiply(markup);
            minersFee = 0.0001;
        }

        fee = xbt.multiply(new bigdecimal.BigDecimal(0.01));
        time = now - this._getRandomNumber(1, 60000);

        transactions.push({
            id: this._getRandomNumber(100, 1000000),
            action: action,
            fiat: fiat.setScale(2, bigdecimal.RoundingMode.DOWN()).toPlainString(),
            xbt: xbt.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString(),
            time: time,
            confirmations: confirmations,
            fee: fee.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString(),
            minersFee: minersFee
        });
    }

    return transactions;
};

Robocoin.prototype.getTransactions = function (since, callback) {

    var transactions;

    if (this._mode == 'random') {
        transactions = this._getRandomlyGeneratedTransactions();
    } else if (this._mode == 'static') {
        transactions = require('../test/apis/robocoinTransactions');
    }

    callback(null, transactions);
};

var robocoin = null;

module.exports = {
    getInstance: function () {

        if (robocoin === null) {
            // TODO check for test mode and return either tester or real API
            robocoin = new Robocoin(config.robocoin);
        }

        return robocoin;
    }
};
