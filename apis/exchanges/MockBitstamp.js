'use strict';

var MockBitstamp = function () {
    console.log('In MockBitstamp constructor');
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
MockBitstamp.prototype.buy = function (amount, price, callback) {
    console.log('MockBitstamp::buy amount: ' + amount + ' price: ' + price);

    price = price * 0.9; // correct for padding

    this.getMinimumOrder(function (err, minimumOrder) {
        if (amount < minimumOrder.minimumOrder) {
            return callback('Amount is below minimum of ' + minimumOrder.minimumOrder);
        }

        callback(null, {
            datetime: '2014-06-16 14:41:14',
            id: 0,
            type: 2,
            fiat: (price * amount),
            xbt: amount,
            fee: (price * amount * 0.005),
            order_id: 0
        });
    });
};

MockBitstamp.prototype.sell = function (amount, price, callback) {
    console.log('MockBitstamp::sell amount: ' + amount + ' price: ' + price);

    price = price * 1.1; // correct for padding

    this.getMinimumOrder(function (err, minimumOrder) {
        if (amount < minimumOrder.minimumOrder) {
            return callback('Amount is below minimum of ' + minimumOrder.minimumOrder);
        }

        callback(null, {
            datetime: '2014-06-16 14:41:14',
            id: 0,
            type: 2,
            fiat: (price * amount),
            xbt: amount,
            fee: (price * amount * 0.005),
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
    callback(null);
};

MockBitstamp.prototype.userTransactions = function (callback) {
    console.log('MockBitstamp::userTransactions');
    callback(null, [{
        datetime: '2014-06-16 14:41:14',
        type: 0,
        fiat: 0,
        xbt: 0,
        fee: 0,
        order_id: 0
    }]);
};

MockBitstamp.prototype.getMinimumOrder = function (callback) {
    return callback(null, { minimumOrder: 0.00769231 });
};

MockBitstamp.prototype.getPrices = function (callback) {
    console.log('MockBitstamp::getPrice');
    callback(null, {
        buyPrice: (Math.floor((Math.random() * (621 - 619 + 1)) + 619)),
        sellPrice: (Math.floor((Math.random() * (621 - 619 + 1)) + 619))
    });
};

var mockBitstamp = null;

module.exports = {

    getInstance: function (config) {

        console.log('checking if mockBitstamp is null');
        if (mockBitstamp === null) {
            console.log('mockBitstamp is null');
            mockBitstamp = new MockBitstamp();
        }

        console.log('returning mockBitstamp', mockBitstamp);
        return mockBitstamp;
    },
    clearInstance: function () {
        mockBitstamp = null;
    }
};