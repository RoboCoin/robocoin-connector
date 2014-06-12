'use strict';

var request = require('request');
var crypto = require('crypto');
var querystring = require('querystring');
var async = require('async');
var config = require('../../connectorConfig');

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

        if (body.error) {
            return callback(
                'Bitstamp response error: ' + ((typeof body.error === 'object') ? body.error.__all__ : body.error)
            );
        }

        return callback(null, body);
    });
};

Bitstamp.prototype.getBalance = function (callback) {
    this.post('/balance/', callback);
};

Bitstamp.prototype.getDepositAddress = function (callback) {
    this.post('/bitcoin_deposit_address/', callback);
};

Bitstamp.prototype._doTrade = function (action, amount, price, callback) {

    var self = this;
    var tradeOrder;

    async.waterfall([
        function (waterfallCallback) {

            // do the trade
            self.post('/' + action + '/', { amount: amount, price: price }, waterfallCallback);
        },
        function (order, waterfallCallback) {

            // wait for the order to execute
            async.doWhilst(
                function (doWhileCallback) {
                    setTimeout(function () {
                        self.userTransactions(function (err, res) {

                            if (err) return doWhileCallback(err);

                            for (var i = 0; i < res.length; i++) {

                                if (res[i].order_id == order.id) {
                                    tradeOrder = res[i];
                                    return doWhileCallback(null);
                                }
                            }

                            return doWhileCallback();
                        });

                    }, 1000);
                },
                function () {

                    return (typeof tradeOrder === 'undefined');
                },
                waterfallCallback
            );
        }
    ], function (err) {

        if (err) return callback(err);

        return callback(null, tradeOrder);
    });
};

/**
 *
 * @param amount
 * @param price Unpadded price to pay for the BTC
 * @param callback callback(err, order) - Order has datetime, id, type, usd, btc, fee, order_id
 */
Bitstamp.prototype.buyLimit = function (amount, price, callback) {
    this._doTrade('buy', amount, price, callback);
};

Bitstamp.prototype.sellLimit = function (amount, price, callback) {
    this._doTrade('sell', amount, price, callback);
};

/**
 *
 * @param amount
 * @param address
 * @param callback callbac(err, res) res contains id
 */
Bitstamp.prototype.withdraw = function (amount, address, callback) {
    this.post('/bitcoin_withdrawal/', { amount: amount, address: address }, callback);
};

Bitstamp.prototype.userTransactions = function (callback) {
    this.post('/user_transactions/', callback);
};

Bitstamp.prototype.getLastPrice = function (callback) {

    this._request('https://www.bitstamp.net/api/ticker/', { json: true }, function (err, response, body) {

        if (err) return callback('Get last price error: ' + err);

        return callback(null, { price: body.last });
    });
};

var bitstamp = null;

module.exports = {

    getInstance: function () {

        if (bitstamp === null) {
            bitstamp = new Bitstamp(config.bitstamp);
        }

        return bitstamp;
    },
    clearInstance: function () {
        bitstamp = null;
    }
};