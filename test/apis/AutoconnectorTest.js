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
