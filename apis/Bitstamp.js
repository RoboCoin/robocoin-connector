'use strict';

var request = require('request');
var crypto = require('crypto');
var querystring = require('querystring');

var Bitstamp = function (options) {

    this._clientId = options.clientId;
    this._apiKey = options.apiKey;
    this._secret = options.secret;
    this._baseUrl = options.baseUrl;
};

Bitstamp.prototype._request = request;

Bitstamp.prototype._getNonce = function () {
    return (new Date()).getTime();
};

Bitstamp.prototype.post = function (url, options, callback) {

    // make options an optional parameter
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    var nonce = this._getNonce();
    var hmac = crypto.createHmac('sha256', this._secret);
    hmac.update(nonce + this._clientId + this._apiKey);

    var authParameters = {
        key: this._apiKey,
        signature: hmac.digest('hex'),
        nonce: nonce
    };

    options.url = this._baseUrl + url;
    options.body = querystring.stringify(authParameters);
    options.method = 'POST';

    this._request(options, function (error, response, body) {

        callback(error);
    });
};

module.exports = Bitstamp;
