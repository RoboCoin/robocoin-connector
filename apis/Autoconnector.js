'use strict';

var Robocoin = require('./Robocoin');
var TransactionMapper = require('../data_mappers/TransactionMapper');
var async = require('async');
var Bitstamp = require('./Bitstamp');
var bigdecimal = require('bigdecimal');

var MARKET_PAD = 0.10;

var Autoconnector = function () {

    this._robocoin = null;
    this._transactionMapper = null;
    this._bitstamp = null;
};

Autoconnector.prototype._getRobocoin = function () {

    if (this._robocoin === null) {
        this._robocoin = new Robocoin('', '');
    }

    return this._robocoin;
};

Autoconnector.prototype._getTransactionMapper = function () {

    if (this._transactionMapper === null) {
        this._transactionMapper = new TransactionMapper();
    }

    return this._transactionMapper;
};

Autoconnector.prototype._getBitstamp = function () {

    if (this._bitstamp === null) {
        this._bitstamp = new Bitstamp({});
    }

    return this._bitstamp;
};

Autoconnector.prototype._replenishAccountBtc = function (unprocessedTx, callback) {

    var self = this;
    var buyOrder;

    async.waterfall([
        function (asyncCallback) {

            self._getBitstamp().getLastPrice(asyncCallback);
        },
        function (lastPrice, asyncCallback) {

            lastPrice = new bigdecimal.BigDecimal(lastPrice.price);
            var price =
                lastPrice.multiply(
                    new bigdecimal.BigDecimal(1 + MARKET_PAD))
                    .setScale(5, bigdecimal.RoundingMode.DOWN());

            self._getBitstamp().buyLimit(Math.abs(unprocessedTx.robocoin_xbt), price.toPlainString(), asyncCallback);
        },
        function (fetchedBuyOrder, asyncCallback) {

            buyOrder = fetchedBuyOrder;
            self._getRobocoin().getAccountInfo(asyncCallback);
        },
        function (accountInfo, asyncCallback) {

            self._getBitstamp().withdraw(
                Math.abs(unprocessedTx.robocoin_xbt),
                accountInfo.depositAddress,
                asyncCallback
            );
        },
        function (withdraw, asyncCallback) {

            unprocessedTx.bitstamp_tx_id = buyOrder.id;
            unprocessedTx.bitstamp_tx_type = buyOrder.type;
            unprocessedTx.bitstamp_fiat = buyOrder.usd;
            unprocessedTx.bitstamp_xbt = buyOrder.btc;
            unprocessedTx.bitstamp_order_id = buyOrder.order_id;
            unprocessedTx.bitstamp_tx_fee = buyOrder.fee;
            unprocessedTx.bitstamp_withdrawal_id = withdraw.id;
            unprocessedTx.bitstamp_tx_time = buyOrder.datetime;

            self._getTransactionMapper().saveExchangeTransaction(unprocessedTx, asyncCallback);
        }
    ], function (err, results) {

        return callback(err);
    });
};

Autoconnector.prototype._sellBtcForFiat = function (unprocessedTx, callback) {

};

Autoconnector.prototype._processUnprocessedTransactions = function (callback) {

    var self = this;

    this._getTransactionMapper().findUnprocessed(function (err, unprocessedTxs) {

        if (unprocessedTxs.length === 0) return callback();

        async.eachSeries(unprocessedTxs, function (unprocessedTx, asyncCallback) {

            switch (unprocessedTx.robocoin_tx_type) {
                case 'send':
                    self._replenishAccountBtc(unprocessedTx, asyncCallback);
                    break;
                case 'forward':
                    self._sellBtcForFiat(unprocessedTx, asyncCallback);
                    break;
                default:
                    callback('Unrecognized transaction type: ' + unprocessedTx.robocoin_tx_type);
            }
        }, callback);
    });
};

/**
 *
 * @param callback callback(err)
 */
Autoconnector.prototype.run = function (callback) {

    var self = this;

    this._getRobocoin().getTransactions(function (err, transactions) {

        if (err) return callback(err);

        async.eachSeries(transactions, function (transaction, asyncCallback) {

            self._getTransactionMapper().save(transaction, asyncCallback);

        }, function (err) {

            if (err) return callback(err);

            self._processUnprocessedTransactions(callback);
        });
    });
};

module.exports = Autoconnector;
