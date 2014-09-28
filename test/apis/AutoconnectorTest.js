'use strict';

var Autoconnector = require('../../apis/Autoconnector');
var assert = require('assert');
var Robocoin = require('../../apis/Robocoin');
var TransactionMapper = require('../../data_mappers/TransactionMapper');
var ConfigMapper = require('../../data_mappers/ConfigMapper');
var sinon = require('sinon');
var Bitstamp = require('../../apis/exchanges/Bitstamp');
var Config = require('../../lib/Config');

describe('Autoconnector', function () {

    var config;
    var autoconnector;

    beforeEach(function () {

        autoconnector = new Autoconnector();
        autoconnector._configMapper = new ConfigMapper();

        config = Config.getInstance();
        config.updateParams([
            {
                kiosk_id: null,
                param_name: 'robocoin.testMode',
                param_value: true
            },
            {
                kiosk_id: '1',
                param_name: 'exchangeClass',
                param_value: 'MockBitstamp'
            }
        ]);
    });

    describe('run', function () {

        beforeEach(function () {

            autoconnector._robocoin = Robocoin.getInstance(config);
            autoconnector._transactionMapper = new TransactionMapper();
            Bitstamp.clearInstance();
            autoconnector._exchange = Bitstamp.getInstance({});
        });

        it('fetches robocoin activity and saves it', function (done) {

            var robocoinTransaction = {
                transactionId: '123',
                action: 'send',
                fiat: '650.00',
                xbt: '1.00000000',
                time: 1401527500000
            };

            sinon.stub(autoconnector._transactionMapper, 'findLastTransactionTime')
                .callsArgWith(0, null, 1401527500000);
            sinon.stub(autoconnector._robocoin, 'getTransactions')
                .callsArgWith(1, null, [robocoinTransaction]);
            sinon.stub(autoconnector._transactionMapper, 'save')
                .callsArg(1);
            sinon.stub(autoconnector, '_processUnprocessedTransactions')
                .callsArg(1);
            sinon.stub(autoconnector._configMapper, 'findAll')
                .callsArgWith(0, null, config);

            autoconnector.run(function (err, res) {

                assert(autoconnector._transactionMapper.save.calledWith(robocoinTransaction));
                assert(autoconnector._processUnprocessedTransactions.called);
                assert(autoconnector._transactionMapper.findLastTransactionTime.called);

                return done(err);
            });
        });

        it('processes unprocessed transactions', function (done) {

            var unprocessedTxs = [];
            unprocessedTxs.push({
                kiosk_id: '1',
                robocoin_tx_type: 'send',
                exchange_withdrawal_id: null
            });
            unprocessedTxs.push({
                kiosk_id: '1',
                robocoin_tx_type: 'forward',
                exchange_withdrawal_id: null,
                confirmations: 6
            });

            sinon.stub(autoconnector._transactionMapper, 'findUnprocessed')
                .callsArgWith(0, null, unprocessedTxs);
            sinon.stub(autoconnector, '_replenishAccountBtc')
                .callsArg(3);
            sinon.stub(autoconnector, '_sellBtcForFiat')
                .callsArg(2);

            autoconnector._processUnprocessedTransactions({}, function () {

                assert(autoconnector._transactionMapper.findUnprocessed.called);
                assert(autoconnector._replenishAccountBtc.called);
                assert(autoconnector._sellBtcForFiat.called);

                done();
            });
        });

        it('buys and withdraws on replenishing', function (done) {

            sinon.stub(autoconnector._transactionMapper, 'saveExchangeTransaction')
                .callsArg(1);

            var unprocessedTx = {
                robocoin_xbt: -0.01000000
            };

            var exchange = {
                getPrices: function () {},
                buy: function () {},
                withdraw: function () {},
                getMinimumOrders: function () {}
            };
            sinon.stub(exchange, 'getPrices')
                .callsArgWith(0, null, { buyPrice: 650.00000, sellPrice: 650.00000 });
            sinon.stub(exchange, 'buy')
                .callsArgWith(2, null, { id: 123 });
            sinon.stub(exchange, 'withdraw')
                .callsArgWith(2, null);
            sinon.stub(exchange, 'getMinimumOrders')
                .callsArgWith(0, null, { minimumBuy: 0.01, minimumSell: 0.01 });

            var robocoin = {
                getAccountInfo: function () {}
            };
            sinon.stub(robocoin, 'getAccountInfo')
                .callsArgWith(0, null, { deposit_address: 'address' });

            autoconnector._replenishAccountBtc(unprocessedTx, robocoin, exchange, function (err) {

                assert(exchange.getPrices.called);
                assert(exchange.buy.calledWith(0.01, '656.50'));
                assert(robocoin.getAccountInfo.called);
                assert(exchange.withdraw.calledWith(0.01, 'address'));
                assert(autoconnector._transactionMapper.saveExchangeTransaction.called);

                done(err);
            });
        });

        it('sells to the exchange on forwarded and confirmed', function (done) {

            sinon.stub(autoconnector._transactionMapper, 'saveExchangeTransaction')
                .callsArg(1);

            var unprocessedTx = {
                robocoin_xbt: 0.01000000
            };

            var exchange = {
                getPrices: function () {},
                sell: function () {}
            };
            sinon.stub(exchange, 'getPrices')
                .callsArgWith(0, null, { buyPrice: 650.00, sellPrice: 650.00 });
            sinon.stub(exchange, 'sell')
                .callsArgWith(2, null, {});

            autoconnector._sellBtcForFiat(unprocessedTx, exchange, function (err) {

                assert(exchange.getPrices.called);
                assert(exchange.sell.calledWith(0.01, '643.49'));
                assert(autoconnector._transactionMapper.saveExchangeTransaction.called);

                done(err);
            });
        });
    });

    describe('batch', function () {

        beforeEach(function () {

            autoconnector._robocoin = Robocoin.getInstance(config);
            autoconnector._transactionMapper = new TransactionMapper();
            Bitstamp.clearInstance();
            autoconnector._exchange = Bitstamp.getInstance();
        });

        it('purchases sum of all sends, sells sum of all forwards', function (done) {

            var unprocessedTransactions = [];
            var t1 = {
                kiosk_id: '1',
                robocoin_tx_type: 'forward',
                robocoin_xbt: 0.004
            };
            unprocessedTransactions.push(t1);
            var t2 = {
                kiosk_id: '1',
                robocoin_tx_type: 'forward',
                robocoin_xbt: 0.004
            };
            unprocessedTransactions.push(t2);
            var t6 = {
                kiosk_id: '1',
                robocoin_tx_type: 'forward',
                robocoin_xbt: 0.004
            };
            unprocessedTransactions.push(t6);
            var t3 = {
                kiosk_id: '1',
                robocoin_tx_type: 'send',
                robocoin_xbt: 0.004
            };
            unprocessedTransactions.push(t3);
            unprocessedTransactions.push({
                kiosk_id: '1',
                robocoin_tx_type: 'send',
                robocoin_xbt: 0.004
            });
            var t4 = {
                kiosk_id: '1',
                robocoin_tx_type: 'send',
                robocoin_xbt: 0.004
            };
            unprocessedTransactions.push(t4);
            var t5 = {
                kiosk_id: '1',
                robocoin_tx_type: 'send',
                robocoin_xbt: 0.004
            };
            unprocessedTransactions.push(t5);

            sinon.stub(autoconnector, '_batchBuy')
                .callsArg(4);
            sinon.stub(autoconnector, '_batchSell')
                .callsArg(3);
            sinon.stub(autoconnector._configMapper, 'findAll')
                .callsArgWith(0, null, config);

            var exchange = {
                getMinimumOrders: function () {},
                getPrices: function () {}
            };
            sinon.stub(exchange, 'getMinimumOrders')
                .callsArgWith(0, null, { minimumBuy: 0.011, minimumSell: 0.011 });
            sinon.stub(exchange, 'getPrices')
                .callsArgWith(0, null, { price: 650.00 });

            autoconnector._doBatchProcess(unprocessedTransactions, '123abc', exchange,  function (err) {

                assert(exchange.getMinimumOrders.called);
                assert(exchange.getPrices.called);
                assert(autoconnector._batchBuy.calledWith('0.01200000', [t3, t4, t4]));
                assert(autoconnector._batchSell.calledWith('0.01200000', [t1, t2, t6]));

                done(err);
            });
        });

        it('does batch buys', function (done) {

            var order = {
                datetime: '',
                id: 0,
                type: 0,
                fiat: 5.20,
                xbt: 0.008,
                fee: 0,
                order_id: 0
            };

            sinon.stub(autoconnector, '_saveTransaction')
                .callsArg(2);

            autoconnector._lastBuyPrice = 650.00;
            var buys = [];
            var t1 = {
                robocoin_tx_type: 'send',
                robocoin_xbt: 0.004
            };
            buys.push(t1);
            var t2 = {
                robocoin_tx_type: 'send',
                robocoin_xbt: 0.004
            };
            buys.push(t2);

            var exchange = {
                buy: function () {},
                withdraw: function () {}
            };
            sinon.stub(exchange, 'buy')
                .callsArgWith(2, null, order);
            sinon.stub(exchange, 'withdraw')
                .callsArgWith(2, null, { withdraw_id: 123 });

            autoconnector._batchBuy(0.008, buys, 'abc123', exchange, function (err) {

                assert(exchange.buy.calledWith(0.008, '656.50'));
                assert(exchange.withdraw.calledWith(0.008, 'abc123'));
                assert(autoconnector._saveTransaction.called);

                done(err);
            });
        });

        it('does batch sells', function (done) {

            var exchangeReturnedOrder = {
                datetime: '',
                id: 0,
                type: 0,
                fiat: 5.20,
                xbt:0.008,
                fee: 0,
                order_id: 0
            };

            sinon.stub(autoconnector, '_saveTransaction')
                .callsArg(2);

            autoconnector._lastSellPrice = 650.00;
            var sells = [];
            var t1 = {
                robocoin_tx_type: 'forward',
                robocoin_xbt: 0.004
            };
            sells.push(t1);
            var t2 = {
                robocoin_tx_type: 'forward',
                robocoin_xbt: 0.004
            };
            sells.push(t2);

            var exchange = {
                sell: function () {}
            };
            sinon.stub(exchange, 'sell')
                .callsArgWith(2, null, exchangeReturnedOrder);

            autoconnector._batchSell(0.008, sells, exchange, function (err) {

                assert(exchange.sell.calledWith(0.008, '643.49'));
                assert(autoconnector._saveTransaction.called);

                done(err);
            });
        });

        it('saves batch processed transactions', function (done) {

            var unprocessedTransaction = {
                robocoin_tx_id: 123,
                robocoin_tx_type: 'send',
                robocoin_fiat: 5.20,
                robocoin_xbt: 0.008,
                robocoin_tx_fee: 0.0008,
                robocoin_tx_time: 1402697232
            };
            var exchangeOrder = {
                id: 234,
                datetime: '2014-06-13 12:34:45',
                type: 0,
                fiat: 10.00,
                xbt: 0.016,
                withdraw_id: 345,
                fee: 0.03,
                order_id: 456
            };

            sinon.stub(autoconnector._transactionMapper, 'saveExchangeTransaction')
                .callsArg(1);

            autoconnector._saveTransaction(unprocessedTransaction, exchangeOrder, function (err) {

                var mergedTransaction = {
                    robocoin_tx_id: 123,
                    robocoin_tx_type: 'send',
                    robocoin_fiat: 5.2,
                    robocoin_xbt: 0.008,
                    robocoin_tx_fee: 0.0008,
                    robocoin_tx_time: 1402697232,
                    exchange_tx_id: 234,
                    exchange_fiat: '5.00',
                    exchange_xbt: 0.008,
                    exchange_tx_fee: 0.03,
                    exchange_tx_time: '2014-06-13 12:34:45'
                };

                assert(autoconnector._transactionMapper.saveExchangeTransaction.calledWith(mergedTransaction));

                done(err);
            });
        });
    });
});
