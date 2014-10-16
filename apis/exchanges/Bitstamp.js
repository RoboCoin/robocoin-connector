'use strict';

var request = require('request');
var crypto = require('crypto');
var querystring = require('querystring');
var async = require('async');
var bigdecimal = require('bigdecimal');
var winston = require('winston');

var Bitstamp = function (config) {

    // use a reference to the config, so updates propagate here and won't require a server restart
    this._config = config;
    this._timeGotLastPrices = null;
    this._nextBuyPrice = null;
    this._nextSellPrice = null;
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
    var hmac = crypto.createHmac('sha256', this._config['bitstamp.secret']);
    hmac.update(nonce + this._config['bitstamp.clientId'] + this._config['bitstamp.apiKey']);

    options.key = this._config['bitstamp.apiKey'];
    options.signature = hmac.digest('hex').toUpperCase();
    options.nonce = nonce;

    var requestOptions = {};
    requestOptions.url = this._config['bitstamp.baseUrl'] + url;
    requestOptions.form = options;
    requestOptions.method = 'POST';
    requestOptions.json = true;

    this._request(requestOptions, function (error, response, body) {

        if (error) return callback('Bitstamp request error: ' + error);

        if (response.statusCode != 200) return callback('Bitstamp response status code: ' + response.statusCode);

        if (body.error) {
            winston.error(body.error);
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

        return callback(null, { address: res });
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

        return callback(null, tradeOrder);
    });
};

/**
 *
 * @param amount Amount of BTC to buy
 * @param price Bid price to pay for the BTC
 * @param callback callback(err, order)
 */
Bitstamp.prototype.buy = function (amount, price, callback) {
    this._doTrade('buy', amount, price, callback);
};

/**
 *
 * @param amount Amount of BTC to sell
 * @param price Ask price for the BTC
 * @param callback callback(err, order)
 */
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
    this._post('/user_transactions/', function (err, exchangeTransactions) {

        if (err) return callback('Error getting transactions: ' + err);

        var transactions = [];
        var transaction;
        for (var i = 0; i < exchangeTransactions.length; i++) {

            transaction = exchangeTransactions[i];
            transactions.push({
                id: transaction.id,
                datetime: transaction.datetime,
                type: transaction.type,
                fiat: transaction.usd,
                xbt: transaction.btc,
                fee: transaction.fee,
                order_id: transaction.order_id
            });
        }

        return callback(null, transactions);
    });
};

Bitstamp.prototype.getPrices = function (callback) {

    var FIVE_MINUTES = 300000;

    // cache the price for five minutes
    if (this._timeGotLastPrices === null || this._timeGotLastPrices.getTime() < ((new Date()).getTime() - FIVE_MINUTES)) {

        this._request('https://www.bitstamp.net/api/order_book/', { json: true }, function (err, response, body) {

            if (err) return callback('Get last prices error: ' + err);

            this._nextBuyPrice = body.asks[0][0];
            this._nextSellPrice = body.bids[0][0];
            this._timeGotLastPrices = new Date();

            return callback(null, { buyPrice: this._nextBuyPrice, sellPrice: this._nextSellPrice });
        });

    } else {

        return callback(null, { buyPrice: this._nextBuyPrice, sellPrice: this._nextSellPrice });
    }
};

Bitstamp.prototype.getMinimumOrders = function (callback) {

    this.getPrices(function (err, prices) {

        if (err) return callback('Error getting last price: ' + err);

        var minimumOrderInFiat = new bigdecimal.BigDecimal(5.00);
        var buyPrice = new bigdecimal.BigDecimal(prices.buyPrice);
        var minimumBuyOrderInXbt = minimumOrderInFiat
            .divide(buyPrice, bigdecimal.MathContext.DECIMAL128())
            .setScale(8, bigdecimal.RoundingMode.DOWN())
            .toPlainString();
        var sellPrice = new bigdecimal.BigDecimal(prices.sellPrice);
        var minimumSellOrderInXbt = minimumOrderInFiat
            .divide(sellPrice, bigdecimal.MathContext.DECIMAL128())
            .setScale(8, bigdecimal.RoundingMode.DOWN())
            .toPlainString();

        return callback(null, {
            minimumBuy: parseFloat(minimumBuyOrderInXbt),
            minimumSell: parseFloat(minimumSellOrderInXbt)
        });
    });
};

Bitstamp.prototype.getRequiredConfirmations = function () {
    return 6;
};

var bitstamp = null;

module.exports = {

    getInstance: function (config) {

        if (bitstamp === null) {
            return new Bitstamp(config);
        }

        return bitstamp;
    },
    clearInstance: function () {
        bitstamp = null;
    }
};