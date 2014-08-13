'use strict';

var config = require('../lib/Config');
var bigdecimal = require('bigdecimal');
var request = require('request');
var crypto = require('crypto');
var querystring = require('querystring');
var url = require('url');

var Robocoin = function (config) {

    this._mode = 'production';
    // use a reference to the config, so updates propagate here and won't require a server restart
    this._config = config;

    if (config.get(null, 'robocoin.testMode') == '1') {
        this._mode = 'random';
    }
};

Robocoin.prototype._request = request;

Robocoin.prototype._getTimestamp = function () {
    return Math.round((new Date()).getTime() / 1000);
};

Robocoin.prototype._getCanonicalParameterString = function (parameterObject) {

    var parameterNames = [];
    for (var key in parameterObject) {
        if (parameterObject.hasOwnProperty(key)) {
            parameterNames.push(key);
        }
    }
    parameterNames.sort();
    var sortedParameterObject = {};
    for (var i = 0; i < parameterNames.length; i++) {
        sortedParameterObject[parameterNames[i]] = parameterObject[parameterNames[i]];
    }

    return querystring.stringify(sortedParameterObject);
};

Robocoin.prototype._getCanonicalHeaders = function (baseUrl, timestamp) {

    var urlObject = url.parse(baseUrl);

    return "host:" + urlObject.host +"\n" +
        "x-request-date:" + timestamp + "\n";
};

Robocoin.prototype._getSignedHeaders = function () {
    return "host;x-request-date";
};

Robocoin.prototype._getCanonicalRequest = function (requestMethod, endpoint, querystringObject,
                                                    baseUrl, timestamp, requestBody) {

    var requestPayload = this._getCanonicalParameterString(requestBody);

    var shasum = crypto.createHash('sha256');
    shasum.update(requestPayload);

    return requestMethod + "\n" +
        endpoint + "\n" +
        this._getCanonicalParameterString(querystringObject) + "\n" +
        this._getCanonicalHeaders(baseUrl, timestamp) + "\n" +
        this._getSignedHeaders() + "\n" +
        shasum.digest('hex');
};

Robocoin.prototype._doRequest = function (endpoint, options, method, callback) {

    var timestamp = this._getTimestamp();
    var baseUrl = this._config.get(null, 'robocoin.baseUrl');
    var urlObject = url.parse(baseUrl + endpoint);
    var canonicalRequest = this._getCanonicalRequest(method, urlObject.pathname, options, baseUrl, timestamp, {});

    var shasum = crypto.createHash('sha256');
    shasum.update(canonicalRequest);
    var hashedCanonicalRequest = shasum.digest('hex');

    var stringToSign = timestamp + "\n" + hashedCanonicalRequest;

    var hmac = crypto.createHmac('sha256', this._config.get(null, 'robocoin.secret'));
    hmac.update(stringToSign);
    var signature = hmac.digest('hex');

    var authorization = "Credential=" + this._config.get(null, 'robocoin.key') + ", SignedHeaders=" +
        this._getSignedHeaders() + ", Signature=" + signature;

    var headers = {
        'X-API-signature': signature,
        'X-Request-Date': timestamp,
        'Authorization' : authorization
    };

    var requestOptions = {
        url: baseUrl + endpoint,
        form: options,
        method: method,
        json: true,
        headers: headers
    };

    this._request(requestOptions, function (error, response, body) {

        if (error) return callback(error);

        if (response.statusCode != 200) return callback(body);

        return callback(error, body);
    });
};

Robocoin.prototype._post = function (endpoint, options, callback) {

    return this._doRequest(endpoint, options, 'POST', callback);
};

Robocoin.prototype._get = function (endpoint, options, callback) {

    return this._doRequest(endpoint, options, 'GET', callback);
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
        xbt_balance: 5.89451,
        deposit_address: '15ukt9EAsbR1LsmUGNyLT1uAokckKXCi1k'
    });
};

Robocoin.prototype.getMachineInfo = function (callback) {

    this._get('/machine', {}, function (err, body) {
        console.log(body);
        return callback(err, body);
    });
};

Robocoin.prototype._getRandomNumber = function (min, max) {
    return Math.floor((Math.random() * (max - min + 1)) + min);
};

Robocoin.prototype._getRandomlyGeneratedTransactions = function () {

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
        var guids = ['d6d70d3a-ee5f-4ac8-b760-4e13f634ce90', '2f44a462-cf38-4442-8bc2-1464491c8959'];

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

Robocoin.prototype.getTransactions = function (since, callback) {

    var transactions;

    if (true/*this._mode == 'random'*/) {
        transactions = this._getRandomlyGeneratedTransactions();
    } else if (this._mode == 'static') {
        transactions = require('../test/apis/robocoinTransactions');
    }

    callback(null, transactions);
};

var robocoin = null;

module.exports = {
    getInstance: function (config) {

        if (robocoin === null) {
            // TODO check for test mode and return either tester or real API
            robocoin = new Robocoin(config);
        }

        return robocoin;
    },
    clearInstance: function () {
        robocoin = null;
    }
};
