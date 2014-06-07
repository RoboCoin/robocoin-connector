'use strict';

var request = require('request');
var crypto = require('crypto');
var querystring = require('querystring');
var async = require('async');

var Bitstamp = function (options) {

    this._clientId = options.clientId;
    this._apiKey = options.apiKey;
    this._secret = options.secret;
    this._baseUrl = options.baseUrl;
};

Bitstamp.prototype._request = request;

Bitstamp.prototype._getNonce = function () {
    return (new Date()).getTime() * 1000;
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

    options.key = this._apiKey;
    options.signature = hmac.digest('hex').toUpperCase();
    options.nonce = nonce;

    var requestOptions = {};
    requestOptions.url = this._baseUrl + url;
    requestOptions.form = options;
    requestOptions.method = 'POST';
    requestOptions.json = true;

    this._request(requestOptions, function (error, response, body) {

        if (error) return callback('Bitstamp request error: ' + error);

        if (response.statusCode != 200) return callback('Bitstamp response status code: ' + response.statusCode);

        if (body.error) return callback('Bitstamp response error: ' + body.error__all__);

        return callback(null, body);
    });
};

Bitstamp.prototype.getBalance = function (callback) {
    this.post('/balance/', callback);
};

Bitstamp.prototype.getDepositAddress = function (callback) {
    this.post('/bitcoin_deposit_address/', callback);
};

Bitstamp.prototype.buyLimit = function (amount, price, callback) {

    var self = this;

    async.waterfall([
        function (waterfallCallback) {

            // do the buy
            self.post('/buy/', { amount: amount, price: price }, waterfallCallback);
        },
        function (order, waterfallCallback) {

            // wait for the order to execute

            var success = false;

            async.doWhilst(
                function (doWhileCallback) {
                    setTimeout(function () {

                        self.post('/open_orders/', function (err, res) {

                            if (err) return doWhileCallback(err);

                            for (var i = 0; i < res.length; i++) {

                                if (res[i].id == order.id) {
                                    success = true;
                                    return doWhileCallback();
                                }
                            }

                            return doWhileCallback();
                        });

                    }, 1000);
                },
                function () {

                    return success;

                },
                waterfallCallback
            );
        }
    ], function (err, res) {

        if (err) return callback(err);

        return callback();
    });
};

Bitstamp.prototype.withdraw = function (amount, address, callback) {

    this.post('/bitcoin_withdrawal/', { amount: amount, address: address }, callback);
};

module.exports = function (options) {
    return new Bitstamp(options);
};
