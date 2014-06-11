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
});
