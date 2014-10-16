'use strict';

var request = require('request');
var async = require('async');
var crypto = require('crypto');
var bigdecimal = require('bigdecimal');

var Cointrader = function (config) {

    this._request = request;
    this._config = config;
};

Cointrader.prototype._getTonce = function () {
    return (new Date()).toISOString();
};

Cointrader.prototype._post = function (endpoint, params, callback) {

    if (typeof callback === 'undefined') {
        callback = params;
        params = {};
    }

    params.t = this._getTonce();

    if (this._config['cointrader.secret'] != '') {
        params.secret = this._config['cointrader.secret'];
    }

    var hmac = crypto.createHmac('sha256', this._config['cointrader.privateKey']);
    var paramsAsString = JSON.stringify(params);
    hmac.update(paramsAsString);

    var requestOptions = {};
    requestOptions.url = this._config['cointrader.baseUrl'] + endpoint;
    requestOptions.method = 'POST';
    requestOptions.json = true;
    requestOptions.body = paramsAsString;
    requestOptions.headers = {
        'Accept': 'application/json',
        'X-Auth': this._config['cointrader.publicKey'],
        'X-Auth-Hash': hmac.digest('hex')
    };

    this._request(requestOptions, function (err, response, body) {

        if (err) return callback('Cointrader POST error: ' + err);

        if (!body.success) {
            return callback('Cointrader POST request unsuccessful: ' + body.data.errorCode + ': ' + body.data.message);
        }

        return callback(null, body.data);
    });
};

Cointrader.prototype._get = function (endpoint, callback) {

    var requestOptions = {
        url: this._config['cointrader.baseUrl'] + endpoint,
        method: 'GET',
        json: true
    };

    this._request(requestOptions, function (err, response, body) {

        if (err) return callback('Cointrader GET error: ' + err);

        if (!body.success) return callback('Cointrader GET request unsuccessful: ' + body);

        return callback(null, body.data);
    });
};

Cointrader.prototype.getBalance = function (callback) {

    this._post('/account/balance', function (err, data) {

        if (err) return callback('Get balance error: ' + err);

        callback(null, {
            btc_available: data.BTC.available,
            fiat_available: data.USD.available
        }); // TODO remove fee from docs?
    });
};

Cointrader.prototype.getDepositAddress = function (callback) {

    this._post('/account/btcaddress', function (err, data) {

        if (err) return callback('Get deposit address error: ' + err);

        callback(null, {
            address: data.btc_address
        });
    });
};

Cointrader.prototype._doTrade = function (tradeType, amount, price, callback) {

    var self = this;
    var order = null;

    this._post('/order/BTCUSD/' + tradeType, { total_quantity: amount, price: price }, function (err, tradeResponse) {

        if (err) return callback('Error on ' + tradeType + ': ' + err);

        async.doWhilst(function (doWhilstCallback) {

            self.userTransactions(function (err, transactions) {

                if (err) return doWhilstCallback(err);

                for (var i = 0; i < transactions.length; i++) {
                    if (transactions[i].id == tradeResponse.id) {
                        order = transactions[i];
                        break;
                    }
                }

                return setTimeout(function () { doWhilstCallback(); }, 1000);
            });
        }, function () {

            return (order === null);

        }, function (err) {

            if (err) return callback(tradeType + ' error: ' + err);
            return callback(null, order);
        });
    });
};

Cointrader.prototype.buy = function (amount, price, callback) {
    this._doTrade('buy', amount, price, callback);
};

Cointrader.prototype.sell = function (amount, price, callback) {
    this._doTrade('sell', amount, price, callback);
};

Cointrader.prototype.withdraw = function (amount, address, callback) {

    var btcTransfer = 5;

    var params = {
        transfer_method: btcTransfer.toString(),
        btc_address: address,
        amount: amount
    };

    this._post('/account/withdraw', params, function (err, data) {

        if (err) return callback('Withdraw error: ' + err);
        return callback();
    });
};

Cointrader.prototype.userTransactions = function (callback) {

    this._post('/account/tradehistory', function (err, trades) {

        if (err) return callback('Error getting trade history: ' + err);

        var userTransactionsByOrderId = [];
        var existingOrder;

        async.each(trades, function (trade, eachCallback) {

            if (!userTransactionsByOrderId[trade.order_id]) {

                userTransactionsByOrderId[trade.order_id] = {
                    datetime: new Date(trade.executed),
                    type: trade.type,
                    fiat: new bigdecimal.BigDecimal(trade.total),
                    xbt: new bigdecimal.BigDecimal(trade.quantity),
                    fee: new bigdecimal.BigDecimal(trade.fee)
                };

            } else {

                existingOrder = userTransactionsByOrderId[trade.order_id];
                existingOrder.datetime = new Date(trade.executed);
                existingOrder.fiat = existingOrder.fiat.add(new bigdecimal.BigDecimal(trade.total));
                existingOrder.xbt = existingOrder.xbt.add(new bigdecimal.BigDecimal(trade.quantity));
                existingOrder.fee = existingOrder.fee.add(new bigdecimal.BigDecimal(trade.fee));
                userTransactionsByOrderId[existingOrder.order_id] = existingOrder;
            }

            return eachCallback();

        }, function (err) {

            if (err) return callback('Error processing trade history: ' + err);

            var orderIds = Object.keys(userTransactionsByOrderId);
            var userTransactions = [];
            for (var i = 0; i < orderIds.length; i++) {
                userTransactions.push({
                    id: orderIds[i],
                    datetime: userTransactionsByOrderId[orderIds[i]].datetime,
                    type: userTransactionsByOrderId[orderIds[i]].type,
                    fiat: userTransactionsByOrderId[orderIds[i]].fiat.setScale(5, bigdecimal.RoundingMode.DOWN()).toPlainString(),
                    xbt: userTransactionsByOrderId[orderIds[i]].xbt.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString(),
                    fee: userTransactionsByOrderId[orderIds[i]].fee.setScale(5, bigdecimal.RoundingMode.DOWN()).toPlainString()
                });
            }

            return callback(null, userTransactions);
        });
    });
};

Cointrader.prototype.getPrices = function (callback) {

    var self = this;

    async.parallel({
        buyPrice: function (parallelCallback) {
            self._get('/stats/high/USD', parallelCallback);
        },
        sellPrice: function (parallelCallback) {
            self._get('/stats/low/USD', parallelCallback);
        }
    }, function (err, result) {

        if (err) return callback('Get prices error: ' + err);

        callback(null, {
            buyPrice: result.buyPrice.price,
            sellPrice: result.sellPrice.price
        });
    });
};

Cointrader.prototype.getMinimumOrders = function (callback) {
    return callback(null, { minimumBuy: 0.005, minimumSell: 0.005 });
};

Cointrader.prototype.getRequiredConfirmations = function () {
    return 3;
};

var cointrader = null;

module.exports = {

    getInstance: function (config) {

        if (cointrader === null) {
            return new Cointrader(config);
        }

        return cointrader;
    },
    clearInstance: function () {
        cointrader = null;
    }
};
