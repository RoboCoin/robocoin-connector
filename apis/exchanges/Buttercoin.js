'use strict';

var bigdecimal = require('bigdecimal');

var Buttercoin = function (config) {
    this._client = require('buttercoinsdk-node')(
        config['buttercoin.apiKey'], config['buttercoin.apiSecret'], config['buttercoin.environment']);
}

Buttercoin.prototype.getBalance = function (callback) {
    this._client.getBalances(function (err, balances) {
        if (err) return callback('Buttercoin get balance err: ' + err);
        return callback(null, {
            btc_available: balances.BTC,
            fiat_available: balances.USD
        });
    });
};


Buttercoin.prototype.getDepositAddress = function (callback) {
    this._client.getDepositAddress(function (err, address) {
        if (err) return callback('Buttercoin get address err: ' + err);
        return callback(null, { address: address });
    });
};

var _commafyErrors = function (errors) {

    var output = [];
    for (var i = 0; i < errors.length; i++) {
        output.push(errors[i].message);
    }

    return output.join(', ');
};

Buttercoin.prototype._order = function(type, amount, price, callback) {

    var self = this;
    amount = amount.toString();
    if (amount.indexOf('.') == 0) {
        amount = '0' + amount;
    }

    var details = {
        instrument: 'BTC_USD',
        side: type,
        orderType: "limit",
        quantity: amount,
        price: price.toString()
    };
    this._client.createOrder(details, function (err, response) {
        if (err) return callback('Buttercoin ' + type + ' err: status ' + err.status + ' '
            + _commafyErrors(err.errors));
        self._client.getOrderByUrl(response.url, function (err, order) {
            if (err) return callback('Buttercoin ' + type + ' get order err: ' + err);
            // loop through events to get order created datetime
            var createdTime;
            for (var i=0; i < order.events.length; i++) {
                if (order.events[i].eventType === 'created') {
                    createdTime = order.events[i].eventDate;
                    break;
                }
            }

            var rate = new bigdecimal.BigDecimal(order.price);
            var fiat = rate.multiply(new bigdecimal.BigDecimal(order.quantity))
                .setScale(8, bigdecimal.RoundingMode.DOWN())
                .toPlainString();

            return callback(null, {
                datetime: Date.parse(createdTime),
                id: order.orderId,
                type: order.side,
                fiat: fiat,
                xbt: order.quantity,
                fee: '0',
                order_id: order.orderId
            });
        });
    });
};

/**
 *
 * @param amount Amount of BTC to buy
 * @param price Bid price to pay for the BTC
 * @param callback callback(err, order)
 */
Buttercoin.prototype.buy = function (amount, price, callback) {
   this._order('buy', amount, price, callback);
};

/**
 *
 * @param amount Amount of BTC to sell
 * @param price Ask price for the BTC
 * @param callback callback(err, order)
 */
Buttercoin.prototype.sell = function (amount, price, callback) {
    this._order('sell', amount, price, callback);
};

/**
 *
 * @param amount
 * @param address
 * @param callback callbac(err, res) res contains id
 */
Buttercoin.prototype.withdraw = function (amount, address, callback) {

    amount = amount.toString();
    if (amount.indexOf('.') == 0) {
        amount = '0' + amount;
    }

    var txn = {
        currency: 'BTC',
        amount: amount,
        destination: address
    };
    this._client.sendBitcoin(txn, function (err) {

        if (err) return callback('Withdraw error: status ' + err.status + ' ' + _commafyErrors(err.errors));

        return callback();
    });
};

Buttercoin.prototype.userTransactions = function (callback) {

    this._client.getOrders(query, function (err, orders) {

        if (err) return callback('Buttercoin get transactions err: ' + err);

        var transactions = [];
        var order;

        for (var i=0; i < orders.length; i++) {

            order = orders[i];
            var rate = new bigdecimal.BigDecimal(order.price);
            var fiat = rate.multiply(new bigdecimal.BigDecimal(order.quantity))
                .setScale(8, bigdecimal.RoundingMode.DOWN())
                .toPlainString();

            transactions.push({
                id: order.orderId,
                datetime: Date.parse(order.events[0].eventDate),
                type: order.side,
                fiat: fiat,
                xbt: order.quantity,
                fee: 0,
                order_id: order.orderId
            });
        }

        return callback(null, transactions);
    });
};

Buttercoin.prototype.getPrices = function (callback) {
    this._client.getTicker(function (err, ticker) {
        if (err) return callback('Buttercoin get ticker err: ' + err);
        return callback(null, {
            buyPrice: ticker.bid,
            sellPrice: ticker.ask
        });
    });
};

Buttercoin.prototype.getMinimumOrders = function (callback) {
    return callback(null, { minimumBuy: 0.01, minimumSell: 0.01 });
};

Buttercoin.prototype.getRequiredConfirmations = function () {
    return 4;
};

var buttercoin = null;

module.exports = {

    getInstance: function (config) {

        if (buttercoin === null) {
            return new Buttercoin(config);
        }

        return buttercoin;
    },
    clearInstance: function () {
        buttercoin = null;
    }
};
