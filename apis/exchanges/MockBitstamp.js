'use strict';

var MockBitstamp = function () {

};

MockBitstamp.prototype.getBalance = function (callback) {
    console.log('MockBitstamp::getBalance');
    return callback(null, {
        btc_available: 0,
        fiat_available: 0,
        fee: 0
    });
};

MockBitstamp.prototype.getDepositAddress = function (callback) {
    console.log('MockBitstamp::getDepositAddress : bac123');
    callback(null, 'bac123');
};

/**
 *
 * @param amount
 * @param price Unpadded price to pay for the BTC
 * @param callback callback(err, order) - Order has datetime, id, type, usd, btc, fee, order_id
 */
MockBitstamp.prototype.buyLimit = function (amount, price, callback) {
    console.log('MockBitstamp::buyLimit amount: ' + amount + ' price: ' + price);

    this.getMinimumOrder(function (err, minimumOrder) {
        if (amount < minimumOrder.minimumOrder) {
            return callback('Amount is below minimum of ' + minimumOrder.minimumOrder);
        }

        callback(null, {
            datetime: '2014-06-16 14:41:14',
            id: 0,
            type: 2,
            fiat: (price * amount),
            btc: amount,
            fee: 0,
            order_id: 0
        });
    });
};

MockBitstamp.prototype.sellLimit = function (amount, price, callback) {
    console.log('MockBitstamp::sellLimit amount: ' + amount + ' price: ' + price);

    this.getMinimumOrder(function (err, minimumOrder) {
        if (amount < minimumOrder.minimumOrder) {
            return callback('Amount is below minimum of ' + minimumOrder.minimumOrder);
        }

        callback(null, {
            datetime: '2014-06-16 14:41:14',
            id: 0,
            type: 2,
            fiat: (price * amount),
            btc: amount,
            fee: 0,
            order_id: 0
        });
    });
};

/**
 *
 * @param amount
 * @param address
 * @param callback callbac(err, res) res contains id
 */
MockBitstamp.prototype.withdraw = function (amount, address, callback) {
    console.log('MockBitstamp::withdraw amount: ' + amount + ' address: ' + address);
    callback(null, {
        id: 0
    });
};

MockBitstamp.prototype.userTransactions = function (callback) {
    console.log('MockBitstamp::userTransactions');
    callback(null, [{
        datetime: '2014-06-16 14:41:14',
        id: 0,
        type: 0,
        usd: 0,
        btc: 0,
        fee: 0,
        order_id: 0
    }]);
};

MockBitstamp.prototype.getMinimumOrder = function (callback) {
    return callback(null, { minimumOrder: 0.00769231 });
};

MockBitstamp.prototype.getLastPrice = function (callback) {
    console.log('MockBitstamp::getLastPrice');
    callback(null, { price: 650.00 });
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