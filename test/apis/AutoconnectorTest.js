'use strict';

var Autoconnector = require('../../apis/Autoconnector');
var robocoinTxs = require('./robocoinTransactions');
var bitstampTxs = require('./bitstampTransactions');
var assert = require('assert');
var Robocoin = require('../../apis/Robocoin');
var TransactionMapper = require('../../data_mappers/TransactionMapper');
var sinon = require('sinon');

describe('Autoconnector', function () {

    var autoconnector;

    beforeEach(function () {

        autoconnector = new Autoconnector();
    });

    describe('detecting candidate tranasactions', function () {

        it('finds candidates for matching transactions when same amount and within an hour', function () {

            var robocoinTx = robocoinTxs[0];
            var bitstampTx = bitstampTxs[0];

            assert(autoconnector.isCandidateTransaction(robocoinTx, bitstampTx));
        });

        it('rejects candidates for matching transactions when same amount but more than an hour after', function () {

            var robocoinTx = robocoinTxs[4];
            var bitstampTx = bitstampTxs[4];

            assert(!autoconnector.isCandidateTransaction(robocoinTx, bitstampTx));
        });

        it('rejects candidates for matching transactions when same amount but more than an hour before', function () {

            var robocoinTx = robocoinTxs[5];
            var bitstampTx = bitstampTxs[5];

            assert(!autoconnector.isCandidateTransaction(robocoinTx, bitstampTx));
        });

        it('finds candidates for matching transactions when same amount but exactly an hour before', function () {

            var robocoinTx = robocoinTxs[6];
            var bitstampTx = bitstampTxs[6];

            assert(autoconnector.isCandidateTransaction(robocoinTx, bitstampTx));
        });

        it('finds candidates for matching transactions when same amount but exactly an hour before', function () {

            var robocoinTx = robocoinTxs[7];
            var bitstampTx = bitstampTxs[7];

            assert(autoconnector.isCandidateTransaction(robocoinTx, bitstampTx));
        });

        it('rejects candidates for matching transactions when different amount but same time', function () {

            var robocoinTx = robocoinTxs[8];
            var bitstampTx = bitstampTxs[8];

            assert(!autoconnector.isCandidateTransaction(robocoinTx, bitstampTx));
        });
    });

    describe('finding best candidate', function () {

        it('uses the bitstamp transaction closest in time to the robocoin transaction', function () {

            var bitstampTransactions = bitstampTxs.slice(8, 11);
            var robocoinTransaction = robocoinTxs[9];

            var indexOfBestCandidate = autoconnector.getIndexOfBestCandidate(robocoinTransaction, bitstampTransactions);

            assert(indexOfBestCandidate === 0);
        });
    });

    describe('run', function () {

        beforeEach(function () {

            var robocoin = new Robocoin('', '');
            var transactionMapper = new TransactionMapper();

            autoconnector._robocoin = robocoin;
            autoconnector._transactionMapper = transactionMapper;
        });

        afterEach(function () {

            autoconnector._robocoin.getTransactions.restore();
            autoconnector._transactionMapper.save.restore();
        });

        it.only('fetches robocoin activity and saves it', function (done) {

            var robocoinTransaction = {
                transactionId: '123',
                action: 'send',
                fiat: '650.00000',
                xbt: '1.00000000',
                time: 1401527500000
            };

            sinon.stub(autoconnector._robocoin, 'getTransactions')
                .callsArgWith(0, null, [robocoinTransaction]);

            sinon.stub(autoconnector._transactionMapper, 'save')
                .callsArg(1);

            autoconnector.run(function (err, res) {

                assert(autoconnector._transactionMapper.save.calledWith(robocoinTransaction));

                return done(err);
            });
        });
    });
});
