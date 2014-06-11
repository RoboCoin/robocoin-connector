'use strict';

var TransactionMapper = require('../../data_mappers/TransactionMapper');

describe('TransactionMapper', function () {

    var transactionMapper;
    var bitstampTxId;

    beforeEach(function () {

        transactionMapper = new TransactionMapper();
        bitstampTxId = Math.floor(Math.random() * 10000) + 1;
    });

    it('finds unprocessed transactions', function (done) {

        transactionMapper.findUnprocessed(function (err, rows) {

            //console.log(rows);

            done(err);
        });
    });

    it('saves exchange transaction info', function (done) {

        var exchangeTx = {};
        exchangeTx.bitstamp_tx_id = bitstampTxId;
        exchangeTx.bitstamp_tx_type = 0;
        exchangeTx.bitstamp_fiat = 5.00;
        exchangeTx.bitstamp_xbt = 0.001;
        exchangeTx.bitstamp_order_id = 123456;
        exchangeTx.bitstamp_tx_fee = 0.3;
        exchangeTx.bitstamp_withdrawal_id = 98764;
        exchangeTx.bitstamp_tx_time = '2014-06-11 23:59:59';

        transactionMapper.saveExchangeTransaction(exchangeTx, function (err) {

            done(err);
        });
    });
});
