'use strict';

var request = require('request');
var crypto = require('crypto');
var querystring = require('querystring');
var async = require('async');
var config = require('../../../connectorConfig');
var bigdecimal = require('bigdecimal');

var Bitstamp = function (options) {

    this._clientId = options.clientId;
    this._apiKey = options.apiKey;
    this._secret = options.secret;
    this._baseUrl = options.baseUrl;
    this._timeGotLastPrice = null;
};

Bitstamp.prototype._request = request;

Bitstamp.prototype._getNonce = function () {
    return (new Date()).getTime() * 1000;
};

Bitstamp.prototype._post = function (url, options, callback) {

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
            console.log(body.error);
            return callback(
                'Bitstamp response error: ' + ((typeof body.error === 'object') ? body.error.__all__ : body.error)
            );
        }

        return callback(null, body);
    });
};

Bitstamp.prototype.getBalance = function (callback) {
    this._post('/balance/', function (err, res) {

        if (err) return callback('Bitstamp get balance err: ' + err);

        return callback(null, {
            btc_available: res.btc_available,
            fiat_available: res.usd_available,
            fee: res.fee
        });
    });
};

Bitstamp.prototype.getDepositAddress = function (callback) {
    this._post('/bitcoin_deposit_address/', function (err, res) {

        if (err) return callback('Bitstamp get address error: ' + err);

        return callback(null, res);
    });
};

Bitstamp.prototype._doTrade = function (action, amount, price, callback) {

    var self = this;
    var tradeOrder;

    async.waterfall([
        function (waterfallCallback) {

            // do the trade
            self._post('/' + action + '/', { amount: amount, price: price }, waterfallCallback);
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

        var returnOrder = {
            datetime: tradeOrder.datetime,
            id: tradeOrder.id,
            type: tradeOrder.type,
            fiat: tradeOrder.usd,//
            btc: tradeOrder.btc,//
            fee: tradeOrder.fee,//
            order_id: tradeOrder.order_id
        };

        return callback(null, returnOrder);
    });
};

/**
 *
 * @param amount
 * @param price Price to pay for the BTC
 * @param callback callback(err, order)
 */
Bitstamp.prototype.buy = function (amount, price, callback) {
    this._doTrade('buy', amount, price, callback);
};

Bitstamp.prototype.sell = function (amount, price, callback) {
    this._doTrade('sell', amount, price, callback);
};

/**
 *
 * @param amount
 * @param address
 * @param callback callbac(err, res) res contains id
 */
Bitstamp.prototype.withdraw = function (amount, address, callback) {
    this._post('/bitcoin_withdrawal/', { amount: amount, address: address }, function (err) {

        return callback(err);
    });
};

Bitstamp.prototype.userTransactions = function (callback) {
    this._post('/user_transactions/', callback);
};

Bitstamp.prototype.getLastPrice = function (callback) {

    var FIVE_MINUTES = 300000;

    // cache the price for five minutes
    if (this._timeGotLastPrice === null || this._timeGotLastPrice.getTime() < ((new Date()).getTime() - FIVE_MINUTES)) {

        this._request('https://www.bitstamp.net/api/ticker/', { json: true }, function (err, response, body) {

            if (err) return callback('Get last price error: ' + err);

            this._lastPrice = body.last;
            this._timeGotLastPrice = new Date();

            return callback(null, { price: body.last });
        });

    } else {

        return callback(null, { price: this._lastPrice });
    }
};

Bitstamp.prototype.getMinimumOrder = function (callback) {

    this.getLastPrice(function (err, lastPrice) {

        if (err) return callback('Error getting last price: ' + err);

        var minimumOrderInFiat = new bigdecimal.BigDecimal(5.00);
        lastPrice = new bigdecimal.BigDecimal(lastPrice.price);
        var minimumOrderInXbt = minimumOrderInFiat
            .divide(lastPrice, bigdecimal.MathContext.DECIMAL128())
            .setScale(8, bigdecimal.RoundingMode.DOWN())
            .toPlainString();

        return callback(null, { minimumOrder: parseFloat(minimumOrderInXbt) });
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