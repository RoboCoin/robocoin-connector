var crypto = require('crypto');
var request = require('request');


var Coinbase = function (config) {
    this._request = request;
    this._config = config;
};

Coinbase.prototype._post = function (endpoint, params, callback) {

    if (typeof callback === 'undefined') {
        callback = params;
        params = {};
    }

    var timestamp = Date.now() / 1000;
    var method = 'POST';
    var key = Buffer(this._config['coinbase.secret'], 'base64');
    var hmac = crypto.createHmac('sha256', key);
    var what = timestamp + method + endpoint + params;

    var requestOptions = {};
    requestOptions.url = this._config['coinbase.baseUrl'] + endpoint;
    requestOptions.method = 'POST';
    requestOptions.json = true;
    requestOptions.body = JSON.stringify(params);
    requestOptions.headers = {
        'Accept': 'application/json',
        'CB-ACCESS-KEY': this._config['coinbase.publicKey'],
        'CB-ACCESS-SIGN': hmac.update(what).digest('base64'),
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-PASSPHRASE': this._config['coinbase.passphrase']
    };

    this._request(requestOptions, function (err, response, body) {
        if (err) {
            return callback('Coinbase POST error: ' + err);
        }

        if (!body.success) {
            var errorCode = (body.data && body.data.errorCode) ? body.data.errorCode : 'unknown';
            var message = (body.data && body.data.message) ? body.data.message : 'unknown';

            return callback('Coinbase POST request unsuccessful: ' + errorCode + ': ' + message);
        }
        return callback(null, body.data);
    });
};

Coinbase.prototype._get = function (endpoint, callback) {
    var timestamp = Date.now() / 1000;
    var method = 'GET';
    var key = Buffer(this._config['coinbase.secret'], 'base64');
    var hmac = crypto.createHmac('sha256', key);
    var what = timestamp + method + endpoint + params;

    var requestOptions = {};
    requestOptions.url = this._config['coinbase.baseUrl'] + endpoint;
    requestOptions.method = 'GET';
    requestOptions.json = true;
    requestOptions.headers = {
        'Accept': 'application/json',
        'CB-ACCESS-KEY': this._config['coinbase.publicKey'],
        'CB-ACCESS-SIGN': hmac.update(what).digest('base64'),
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-PASSPHRASE': this._config['coinbase.passphrase']
    };

    this._request(requestOptions, function (err, response, body) {
        if (err) return callback('Coinbase GET error: ' + err);
        if (!body.success) return callback('Coinbase GET request unsuccessful: ' + body);

        return callback(null, body);
    });
};

Coinbase.prototype.getBalance = function (callback) {

    this._get('/account/', function (err, data) {
        if (err) return callback('Get balance error: ' + err);

        callback(null, {
            btc_available: data.balance,
            fiat_available: data.USD.available
        });
    });
};

Coinbase.prototype.getDepositAddress = function (callback) {

    this._get('/account/', function (err, data) {
        if (err) return callback('Get deposit address error: ' + err);

        callback(null, {
            address: data[0].id
        });
    });
};

Coinbase.prototype._doTrade = function (tradeType, amount, price, callback) {

    var self = this;
    var order = null;

    this._post('/orders', { size: amount, price: price, side: tradeType, product_id: "BTC-USD" }, function (err, tradeResponse) {
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

Coinbase.prototype.buy = function (amount, price, callback) {
    this._doTrade('buy', amount, price, callback);
};

Coinbase.prototype.sell = function (amount, price, callback) {
    this._doTrade('sell', amount, price, callback);
};

Coinbase.prototype.withdraw = function (amount, address, callback) {
    var btcTransfer = 5;

    var params = {
        type: 'withdraw',
        amount: amount,
        coinbase_account_id: address
    };

    this._post('/transfers', params, function (err, data) {
        if (err) return callback('Withdraw error: ' + err);
        return callback();
    });
};

Coinbase.prototype.userTransactions = function (account_id, callback) {

    this._post('/accounts/' + account_id + '/ledger', function (err, trades) {
        if (err) return callback('Error getting trade history: ' + err);

        var userTransactionsByOrderId = [];
        var existingOrder;

        async.each(trades, function (trade, eachCallback) {

            if (!userTransactionsByOrderId[trade.id]) {
                userTransactionsByOrderId[trade.id] = {
                    datetime: new Date(trade.time),
                    type: trade.type,
                    fiat: new bigdecimal.BigDecimal(trade.total),
                    xbt: new bigdecimal.BigDecimal(trade.amount),
                    fee: new bigdecimal.BigDecimal(0)
                };
            } else {
                existingOrder = userTransactionsByOrderId[trade.id];
                existingOrder.datetime = new Date(trade.time);
                existingOrder.fiat = existingOrder.fiat.add(new bigdecimal.BigDecimal(trade.total));
                existingOrder.xbt = existingOrder.xbt.add(new bigdecimal.BigDecimal(trade.amount));
                existingOrder.fee = existingOrder.fee.add(new bigdecimal.BigDecimal(0));
                userTransactionsByOrderId[existingOrder.id] = existingOrder;
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

Coinbase.prototype.getPrices = function (callback) {

    var self = this;
    self._get('/products/BTC-USD/trades', function(err, result) {
        callback(null, {
            return {
                buyPrice: result[0].price,
                sellPrice: result[1].price
            }
        });
    });
};

Coinbase.prototype.getMinimumOrders = function (callback) {
    return callback(null, { minimumBuy: 0.005, minimumSell: 0.005 });
};

Coinbase.prototype.getRequiredConfirmations = function () {
    return 6;
};

var coinbase = null;

module.exports = {

    getInstance: function (config) {

        if (coinbase === null) {
            return new Coinbase(config);
        }

        return coinbase;
    },
    clearInstance: function () {
        coinbase = null;
    }
};