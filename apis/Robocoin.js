'use strict';

var config = require('../lib/Config');
var bigdecimal = require('bigdecimal');
var request = require('request');
var crypto = require('crypto');
var querystring = require('querystring');
var url = require('url');
var MockRobocoin = require('./MockRobocoin');

var Robocoin = function (config) {

    // use a reference to the config, so updates propagate here and won't require a server restart
    this._config = config;
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
        method: method,
        json: true,
        headers: headers
    };

    if (Object.keys(options).length > 0) {
        if (method == 'GET') {
            requestOptions.qs = options;
        } else if (method == 'POST') {
            requestOptions.form = options;
        }
    }

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

Robocoin.prototype.getAccountInfo = function (callback) {

    this._get('/account', {}, function (err, response, body) {
        return callback(err, response);
    });
};

Robocoin.prototype.getMachineInfo = function (callback) {

    this._get('/machine', {}, function (err, response, body) {
        return callback(err, response);
    });
};

Robocoin.prototype.getTransactions = function (since, callback) {

    this._get('/account/activity', { since: since }, function (err, response, body) {
        return callback(err, response);
    });
};

Robocoin.prototype.isMock = function () {
    return false;
};

var robocoin = null;

module.exports = {
    getInstance: function (config) {

        if (config.get(null, 'robocoin.testMode') == '0') {
            if (robocoin === null || robocoin.isMock()) {
                robocoin = new Robocoin(config);
            }
        } else {
            if (robocoin === null || !robocoin.isMock()) {
                robocoin = new MockRobocoin();
            }
        }

        return robocoin;
    },
    clearInstance: function () {
        robocoin = null;
    }
};
