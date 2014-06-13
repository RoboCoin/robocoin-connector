'use strict';

var MockBitstamp = function () {

};

MockBitstamp.prototype.getBalance = function (callback) {
    callback(null, {
        usd_balance: 0,
        btc_balance: 0,
        usd_reserved: 0,
        btc_reserved: 0,
        usd_available: 0,
        btc_available: 0,
        fee: 0
    });
};

MockBitstamp.prototype.getDepositAddress = function (callback) {
    callback(null, { address: 'bac123' });
};

/**
 *
 * @param amount
 * @param price Unpadded price to pay for the BTC
 * @param callback callback(err, order) - Order has datetime, id, type, usd, btc, fee, order_id
 */
MockBitstamp.prototype.buyLimit = function (amount, price, callback) {
    callback(null, {
        datetime: '',
        id: 0,
        type: 2,
        usd: amount,
        btc: 0,
        fee: 0,
        order_id: 0
    });
};

MockBitstamp.prototype.sellLimit = function (amount, price, callback) {
    callback(null, {
        datetime: '',
        id: 0,
        type: 2,
        usd: amount,
        btc: 0,
        fee: 0,
        order_id: 0
    });
};

/**
 *
 * @param amount
 * @param address
 * @param callback callbac(err, res) res contains id
 */
MockBitstamp.prototype.withdraw = function (amount, address, callback) {
    callback(null, {
        id: 0
    });
};

MockBitstamp.prototype.userTransactions = function (callback) {
    callback(null, {
        datetime: '',
        id: 0,
        type: 0,
        usd: 0,
        btc: 0,
        fee: 0,
        order_id: 0
    });
};

MockBitstamp.prototype.getLastPrice = function (callback) {
    callback(null, {
        last: 0,
        high: 0,
        low: 0,
        vwap: 0,
        volume: 0,
        bid: 0,
        ask: 0
    });
};

var mockBitstamp = null;

module.exports = {

    getInstance: function () {

        if (mockBitstamp === null) {
            mockBitstamp = new MockBitstamp();
        }

        return mockBitstamp;
    },
    clearInstance: function () {
        mockBitstamp = null;
    }
};