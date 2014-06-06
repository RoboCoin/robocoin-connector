'use strict';

var Robocoin = function (key, secret) {

};

Robocoin.prototype.getAccountInfo = function (callback) {

    callback(null, { xbtBalance: 5.89451 });
};

Robocoin.prototype.getTransactions = function (callback) {

    var transactions = [];
    transactions.push({
        id: '68ad4fa1df984ad3f21ad68f4',
        action: 'receive',
        fiat: 800.520000,
        xbt: 1.24000000,
        time: 1401994862000
    });
    transactions.push({
        id: '89adf453a1df98ad4f123a1df',
        action: 'receive',
        fiat: 654.540000,
        xbt: 0.10000000,
        time: 1401995863000
    });
    transactions.push({
        id: '98a4d1f31ad98f41a23d1f6ad',
        action: 'send',
        fiat: 1823.990000,
        xbt: 3.34852155,
        time: 1401996866000
    });
    transactions.push({
        id: 'adfa89d4f5a6d1f9a8d4fa56df',
        action: 'receive',
        fiat: 660.120000,
        xbt: 1.00000000,
        time: 1401999865000
    });

    callback(null, transactions);
};

module.exports = function (key, secret) {

    return new Robocoin(key, secret);
};
