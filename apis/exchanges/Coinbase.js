var CoinbaseExchange = require('coinbase-exchange');
var request = require('request');
var async = require('async');
var crypto = require('crypto');

var Coinbase = function (config) {
    this._request = request;
    this._config = config;

    this.publicClient = new CoinbaseExchange.PublicClient();
    this.authedClient = new CoinbaseExchange.AuthenticatedClient(
        this._config['coinbase.exchangePublicKey'],
        this._config['coinbase.secret'],
        this._config['coinbase.passphrase']
    );
};

Coinbase.prototype._call = function (reqtype, endpoint, params, callback) {

    if(typeof callback === 'undefined') {
        callback = params;
        params = {};
    }
    
    var timestamp = Date.now();
    var url = this._config['coinbase.coinbaseBaseUrl'] + endpoint;
    var what;
    if(Object.keys(params).length === 0) {
      what = timestamp + url;
    } else {
      what = timestamp + url + JSON.stringify(params);
    }
    var hmac = crypto.createHmac('sha256', this._config['coinbase.coinbaseAPISecret']).update(what).digest('hex');

    var requestOptions = {};
    requestOptions.url = url;
    requestOptions.method = reqtype;
    if(reqtype == 'POST') {
        requestOptions.json = true;
        requestOptions.body = JSON.stringify(params);
    }
    requestOptions.headers = {
        'Content-Type': 'application/json',
        'ACCESS_KEY': this._config['coinbase.coinbaseAPIKey'],
        'ACCESS_SIGNATURE': hmac,
        'ACCESS_NONCE': timestamp
    };

    this._request(requestOptions, function (err, response, body) {
        if (err) return callback('Coinbase GET error: ' + err);
        return callback(null, body);
    });
};

/* Coinbase Exchange API methods */
// done
Coinbase.prototype.buy = function (amount, price, callback) {
    var buyParams = {
        'price' : price,
        'size' : amount,
        'product_id' : 'BTC-USD'
    };

    var self = this;

    self.authedClient.buy(buyParams, function(err, response, result) {
        if(err) return callback('Coinbase buy error: ' + err);

        self.authedClient.getOrder(result.id, function(err, response, order) {
            var fiat = parseFloat(order.size) * parseFloat(order.price);
            callback(null, {
                'datetime': order.created_at,
                'id': order.id,
                'type': order.side,
                'fiat': fiat,
                'xbt': order.size,
                'fee': order.fill_fees,
                'order_id': result.id
            })
        });
    });
};
// done
Coinbase.prototype.sell = function (amount, price, callback) {
    var sellParams = {
        'price' : price,
        'size' : amount,
        'product_id' : 'BTC-USD'
    };

    var self = this;

    self.authedClient.sell(sellParams, function(err, response, result) {
        if(err) return callback('Coinbase sell error: ' + err);

        self.authedClient.getOrder(result.id, function(err, response, order) {
            var fiat = parseFloat(order.size) * parseFloat(order.price);
            callback(null, {
                'datetime': order.created_at,
                'id': order.id,
                'type': order.side,
                'fiat': fiat,
                'xbt': order.size,
                'fee': order.fill_fees,
                'order_id': result.id
            })
        });
    });
};
// done
Coinbase.prototype.getPrices = function (callback) {

    this.publicClient.getProductOrderBook({ level: 1 }, function(err, response, result) {
        if(err) return callback('Coinbase get prices err: ' + err);
        
        callback(null, {
            buyPrice : result.asks[0][0],
            sellPrice : result.bids[0][0]
        });
    });
};

/* Coinbase Wallet API methods */
// done
Coinbase.prototype.getBalance = function (callback) {

    var self = this;

    self._call('GET', '/accounts/' + self._config['coinbase.coinbaseAccountID'] + '/balance', function(err, balance) {
        if(err) callback("Coinbase get balance error: " + err);

        balance = JSON.parse(balance);

        var url = self._config['coinbase.coinbaseBaseUrl'] + '/prices/sell';
        self._request(url, function(err, res, body) {
            if(err) callback("Coinbase get balance error: " + err);

            body = JSON.parse(body);
            var fiatrate = parseFloat(body.subtotal.amount);
            fiat = fiatrate * parseFloat(balance.amount);
            callback(null, {
                'btc_available': balance.amount,
                'fiat_available': fiat
            }); 
        });
    });    
};
// done
Coinbase.prototype.getDepositAddress = function (callback) {
    var url = '/accounts/' + this._config['coinbase.coinbaseAccountID'] + '/address';
    this._call('GET', url, function(err, addr) {
        addr = JSON.parse(addr);
        callback(null, {
            'address': addr.address
        });
    });
};
// done
Coinbase.prototype.withdraw = function (amount, address, callback) {
    var url = '/transactions/send_money';
    var txn = {
        "to": address,
        "amount": amount,
        "notes": ""
    };
    this._call('POST', url, txn, function(err, res) {
        if(err) callback('Coinbase withdraw error: ' + err);

        res = JSON.parse(res);
        if(res.success == true) {
            callback(null);
        }
    });
};

/* Coinbase Exchange + Wallet account ID methods */
// done
Coinbase.prototype.userTransactions = function (callback) {
    var url = '/transactions';
    var price;

    var self = this;

    self.getPrices(function(err, prices) {
        if(err) callback('Coinbase user transactions error: ' + err);
        price = prices.sellPrice;

        self._call('GET', url, function(err, txns) {
            if(err) callback('Coinbase error in user transactions: ' + err);
            
            var userTransactionsById = {};
            txns = JSON.parse(txns);

            async.each(txns.transactions, function (txn, eachCallback) {
                var amount = parseFloat(txn.transaction.amount.amount);
                var fiat = amount * price;
                userTransactionsById[txn.transaction.id] = {
                    datetime: new Date(txn.transaction.created_at),
                    type: 'withdraw',
                    fiat: fiat,
                    xbt: amount,
                    fee: 0
                };
                return eachCallback();
            }, function (err) {
                if (err) return callback('Error processing trade history: ' + err);

                var txnIds = Object.keys(userTransactionsById);
                var userTransactions = [];
                for (var i = 0; i < txnIds.length; i++) {
                    var id = txnIds[i];
                    var txn = userTransactionsById[id];

                    userTransactions.push({
                        id: id,
                        order_id: id, 
                        datetime: txn.datetime,
                        type: 'withdraw',
                        fiat: txn.fiat,
                        xbt: txn.xbt,
                        fee: txn.fee
                    });
                }
                return callback(null, userTransactions);
            });
        });
    });
};

// hard-coded
Coinbase.prototype.getMinimumOrders = function (callback) {
    return callback(null, { minimumBuy: 0.005, minimumSell: 0.005 });
};
// hard-coded
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
