'use strict';

var Coinbase = require('../../apis/exchanges/Coinbase');
var configFile = require('../../../connectorConfig').coinbase;
var assert = require('assert');
var Config = require('../../lib/Config');

describe('Coinbase', function () {

    var coinbase;

    beforeEach(function () {

        var config = Config.getInstance();
        for (var param in configFile) {
            config.set('1', 'coinbase.' + param, configFile[param]);
        }
        coinbase = Coinbase.getInstance(config.getAllForKiosk('1'));
    });

    afterEach(function () {
        Coinbase.clearInstance();
    });

    it('gets account balances', function (done) {

        coinbase.getBalance(function (err, balances) {

            assert(balances.btc_available);
            assert(balances.fiat_available);
            console.log(balances);

            done(err);
        });
    });

    it('gets a deposit address', function (done) {

        coinbase.getDepositAddress(function (err, res) {

            assert(res.address);

            done(err);
        });
    });

    it('buys BTC', function (done) {

        coinbase.buy(0.01, 700.00, function (err, res) {

            assert(res.datetime);
            assert(res.id);
            assert(res.type);
            assert(res.fiat);
            assert(res.xbt);
            assert(res.fee);
            assert(res.order_id);
            console.log(err, res);

            done(err);
        });
    });

    it('sells BTC', function (done) {

        coinbase.sell(0.01, 600.00, function (err, res) {

            assert(res.datetime);
            assert(res.id);
            assert(res.type);
            assert(res.fiat);
            assert(res.xbt);
            assert(res.fee);
            assert(res.order_id);
            console.log(err, res);

            done(err);
        });
    });
    /*
    it('withdraws BTC', function (done) {

        coinbase.withdraw(0.01, '1Q9V8Pz8Ae4MDf957cQuUq9AVLVbJv6JCV', function (err) {

            done(err);
        });
    });
    */
    it('gets user transactions', function (done) {

        coinbase.userTransactions(function (err, transactions) {

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

        coinbase.getPrices(function (err, prices) {

            assert(prices.buyPrice);
            assert(prices.sellPrice);

            done(err);
        });
    });
});
