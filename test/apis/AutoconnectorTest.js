'use strict';

var Autoconnector = require('../../apis/Autoconnector');
var robocoinTxs = require('./robocoinTransactions');
var bitstampTxs = require('./bitstampTransactions');
var assert = require('assert');
var Robocoin = require('../../apis/Robocoin');
var TransactionMapper = require('../../data_mappers/TransactionMapper');
var sinon = require('sinon');
var Bitstamp = require('../../apis/Bitstamp');

describe('Autoconnector', function () {

    var autoconnector;

    beforeEach(function () {

        autoconnector = new Autoconnector();
    });

    describe('run', function () {

        beforeEach(function () {

            autoconnector._robocoin = Robocoin.getInstance();
            autoconnector._transactionMapper = new TransactionMapper();
            Bitstamp.clearInstance();
            autoconnector._bitstamp = Bitstamp.getInstance();
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
                .callsArg(0);

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
                robocoin_tx_type: 'send',
                bitstamp_withdrawal_id: null,
                confirmations: null,
                bitstamp_order_id: null
            });
            unprocessedTxs.push({
                robocoin_tx_type: 'forward',
                bitstamp_withdrawal_id: null,
                confirmations: 6,
                bitstamp_order_id: null
            });

            sinon.stub(autoconnector._transactionMapper, 'findUnprocessed')
                .callsArgWith(0, null, unprocessedTxs);
            sinon.stub(autoconnector, '_replenishAccountBtc')
                .callsArg(1);
            sinon.stub(autoconnector, '_sellBtcForFiat')
                .callsArg(1);

            autoconnector._processUnprocessedTransactions(function () {

                assert(autoconnector._transactionMapper.findUnprocessed.called);
                assert(autoconnector._replenishAccountBtc.called);
                assert(autoconnector._sellBtcForFiat.called);

                done();
            });
        });

        it('buys and withdraws on replenishing', function (done) {

            sinon.stub(autoconnector._bitstamp, 'getLastPrice')
                .callsArgWith(0, null, { price: 650.00000 });
            sinon.stub(autoconnector._bitstamp, 'buyLimit')
                .callsArgWith(2, null, { id: 123 });
            sinon.stub(autoconnector._robocoin, 'getAccountInfo')
                .callsArgWith(0, null, { depositAddress: 'address' });
            sinon.stub(autoconnector._bitstamp, 'withdraw')
                .callsArgWith(2, null, { id: 123456 });
            sinon.stub(autoconnector._transactionMapper, 'saveExchangeTransaction')
                .callsArg(1);

            var unprocessedTx = {
                robocoin_xbt: -0.01000000
            };

            autoconnector._replenishAccountBtc(unprocessedTx, function (err) {

                assert(autoconnector._bitstamp.getLastPrice.called);
                assert(autoconnector._bitstamp.buyLimit.calledWith(0.01, '715.00'));
                assert(autoconnector._robocoin.getAccountInfo.called);
                assert(autoconnector._bitstamp.withdraw.calledWith(0.01, 'address'));
                assert(autoconnector._transactionMapper.saveExchangeTransaction.called);

                done(err);
            });
        });

        it('sells to the exchange on forwarded and confirmed', function (done) {

            sinon.stub(autoconnector._bitstamp, 'getLastPrice')
                .callsArgWith(0, null, { price: 650.00 });
            sinon.stub(autoconnector._bitstamp, 'sellLimit')
                .callsArgWith(2, null, {});
            sinon.stub(autoconnector._transactionMapper, 'saveExchangeTransaction')
                .callsArg(1);

            var unprocessedTx = {
                robocoin_xbt: 0.01000000
            };

            autoconnector._sellBtcForFiat(unprocessedTx, function (err) {

                assert(autoconnector._bitstamp.getLastPrice.called);
                assert(autoconnector._bitstamp.sellLimit.calledWith(0.01, '585.00'));
                assert(autoconnector._transactionMapper.saveExchangeTransaction.called);

                done(err);
            });
        });
    });

    describe('batch', function () {

        beforeEach(function () {

            autoconnector._robocoin = Robocoin.getInstance();
            autoconnector._transactionMapper = new TransactionMapper();
            Bitstamp.clearInstance();
            autoconnector._bitstamp = Bitstamp.getInstance();
        });

        it('purchases sum of all sends, sells sum of all forwards', function (done) {

            var unprocessedTransactions = [];
            var t1 = {
                robocoin_tx_type: 'forward',
                robocoin_xbt: 0.004
            };
            unprocessedTransactions.push(t1);
            var t2 = {
                robocoin_tx_type: 'forward',
                robocoin_xbt: 0.004
            };
            unprocessedTransactions.push(t2);
            unprocessedTransactions.push({
                robocoin_tx_type: 'forward',
                robocoin_xbt: 0.004
            });
            var t3 = {
                robocoin_tx_type: 'send',
                robocoin_xbt: 0.004
            };
            unprocessedTransactions.push(t3);
            unprocessedTransactions.push({
                robocoin_tx_type: 'send',
                robocoin_xbt: 0.004
            });
            var t4 = {
                robocoin_tx_type: 'send',
                robocoin_xbt: 0.004
            };
            unprocessedTransactions.push(t4);

            sinon.stub(autoconnector._bitstamp, 'getLastPrice')
                .callsArgWith(0, null, 650.00);
            sinon.stub(autoconnector, '_batchBuy')
                .callsArg(3);
            sinon.stub(autoconnector, '_batchSell')
                .callsArg(2);

            autoconnector.batchProcess(unprocessedTransactions, '123abc', function (err) {

                assert(autoconnector._bitstamp.getLastPrice.calledOnce);
                assert(autoconnector._batchBuy.calledWith(0.008, [t3, t4]));
                assert(autoconnector._batchSell.calledWith(0.008, [t1, t2]));

                done(err);
            });
        });

        it('does batch buys', function (done) {

            var order = {
                datetime: '',
                id: 0,
                type: 0,
                usd: 5.20,
                btc: 0.008,
                fee: 0,
                order_id: 0
            };

            sinon.stub(autoconnector._bitstamp, 'buyLimit')
                .callsArgWith(2, null, order);
            sinon.stub(autoconnector._bitstamp, 'withdraw')
                .callsArgWith(2, null, { withdraw_id: 123 });
            sinon.stub(autoconnector, '_saveTransaction')
                .callsArg(2);

            autoconnector._lastPrice = 650.00;
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

            autoconnector._batchBuy(0.008, buys, 'abc123', function (err) {

                assert(autoconnector._bitstamp.buyLimit.calledWith(0.008, '715.00'));
                assert(autoconnector._bitstamp.withdraw.calledWith(0.008, 'abc123'));
                assert(autoconnector._saveTransaction.called);

                done(err);
            });
        });

        it('saves batch processed transactions', function (done) {

            // TODO save multiple
            var unprocessedTransaction = {
                robocoin_tx_id: 123,
                robocoin_tx_type: 'send',
                robocoin_fiat: 5.20,
                robocoin_xbt: 0.008,
                robocoin_tx_fee: 0.0008,
                robocoin_miners_fee:0.00005,
                robocoin_tx_time: 1402697232
            };
            var exchangeOrder = {
                id: 234,
                datetime: '2014-06-13 12:34:45',
                type: 0,
                usd: 5.00,
                btc: 0.008,
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
                    robocoin_fiat: 5.20,
                    robocoin_xbt: 0.008,
                    robocoin_tx_fee: 0.0008,
                    robocoin_miners_fee: 0.00005,
                    robocoin_tx_time: 1402697232,
                    bitstamp_tx_id: 234,
                    bitstamp_tx_type: 0,
                    bitstamp_fiat: 5.00,
                    bitstamp_xbt: 0.008,
                    bitstamp_order_id: 456,
                    bitstamp_tx_fee: 0.03,
                    bitstamp_tx_time: '2014-06-13 12:34:45'
                };

                assert(autoconnector._transactionMapper.saveExchangeTransaction.calledWith(mergedTransaction));

                done(err);
            });
        });
    });
});
