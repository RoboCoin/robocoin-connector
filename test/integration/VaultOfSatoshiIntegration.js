'use strict';

var VaultOfSatoshi = require('../../apis/exchanges/VaultOfSatoshi');
var config = require('../../../connectorConfig').vaultOfSatoshi;
var assert = require('assert');

describe('VaultOfSatoshi', function () {

    var vaultOfSatoshi;

    beforeEach(function () {
        vaultOfSatoshi = VaultOfSatoshi.getInstance(config);
    });

    afterEach(function () {
        VaultOfSatoshi.clearInstance();
    });

    it('gets account balances', function (done) {

        vaultOfSatoshi.getBalance(function (err, balances) {

            assert(balances.btc_available);
            assert(balances.fiat_available);
            console.log(balances);

            done(err);
        });
    });

    it('gets a deposit address', function (done) {

        vaultOfSatoshi.getDepositAddress(function (err, res) {

            assert(res.address);

            done(err);
        });
    });

    it('buys BTC', function (done) {

        vaultOfSatoshi.buy(0.01, 700.00, function (err, res) {

            console.log(err, res);
            /*assert(res.datetime);
            assert(res.id);
            assert(res.type);
            assert(res.fiat);
            assert(res.xbt);
            assert(res.fee);
            assert(res.order_id);*/

            done(err);
        });
    });

    it('sells BTC', function (done) {

        vaultOfSatoshi.sell(0.01, 600.00, function (err, res) {

            console.log(err, res);
            /*assert(res.datetime);
             assert(res.id);
             assert(res.type);
             assert(res.fiat);
             assert(res.xbt);
             assert(res.fee);
             assert(res.order_id);*/

            done(err);
        });
    });

    it('withdraws BTC', function (done) {

        vaultOfSatoshi.withdraw(0.01, '1Q9V8Pz8Ae4MDf957cQuUq9AVLVbJv6JCV', function (err) {

            done(err);
        });
    });

    it('gets user transactions', function (done) {

        vaultOfSatoshi.userTransactions(function (err, transactions) {

            assert(transactions.length > 0);
            assert(transactions[0].datetime);
            assert(transactions[0].type);
            assert(transactions[0].fiat);
            assert(transactions[0].xbt);
            assert(transactions[0].fee);
            assert(transactions[0].order_id);

            done(err);
        });
    });

    it('gets the last prices', function (done) {

        vaultOfSatoshi.getPrices(function (err, prices) {

            assert(prices.buyPrice);
            assert(prices.sellPrice);

            done(err);
        });
    });
});
