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
        this._bitstamp = Bitstamp.getInstance();
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
                    .setScale(2, bigdecimal.RoundingMode.DOWN());

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

            unprocessedTx.bitstamp_withdrawal_id = withdraw.id;
            unprocessedTx = self._mergeExchangeWithUnprocessedTx(unprocessedTx, buyOrder);

            self._getTransactionMapper().saveExchangeTransaction(unprocessedTx, asyncCallback);
        }
    ], function (err, results) {

        return callback(err);
    });
};

Autoconnector.prototype._mergeExchangeWithUnprocessedTx = function (unprocessedTx, exchangeOrder) {

    unprocessedTx.bitstamp_tx_id = exchangeOrder.id;
    unprocessedTx.bitstamp_tx_type = exchangeOrder.type;
    unprocessedTx.bitstamp_fiat = exchangeOrder.usd;
    unprocessedTx.bitstamp_xbt = exchangeOrder.btc;
    unprocessedTx.bitstamp_order_id = exchangeOrder.order_id;
    unprocessedTx.bitstamp_tx_fee = exchangeOrder.fee;
    unprocessedTx.bitstamp_tx_time = exchangeOrder.datetime;

    return unprocessedTx;
};

Autoconnector.prototype._sellBtcForFiat = function (unprocessedTx, callback) {

    var self = this;

    async.waterfall([
        function (asyncCallback) {
            console.log('getting last price');
            self._getBitstamp().getLastPrice(asyncCallback);
        },
        function (lastPrice, asyncCallback) {

            lastPrice = new bigdecimal.BigDecimal(lastPrice.price);
            var price
                = lastPrice.multiply(
                    new bigdecimal.BigDecimal(1 - MARKET_PAD))
                    .setScale(2, bigdecimal.RoundingMode.DOWN());
            console.log('selling at limit');
            self._getBitstamp().sellLimit(unprocessedTx.robocoin_xbt, price.toPlainString(), asyncCallback);
        },
        function (sellOrder, asyncCallback) {
            console.log('saving exchange tx');
            unprocessedTx = self._mergeExchangeWithUnprocessedTx(unprocessedTx, sellOrder);

            self._getTransactionMapper().saveExchangeTransaction(unprocessedTx, asyncCallback);
        }
    ], callback);
};

Autoconnector.prototype._processUnprocessedTransactions = function (callback) {

    var self = this;

    this._getTransactionMapper().findUnprocessed(function (err, unprocessedTxs) {
        console.log('there are ' + unprocessedTxs.length + ' unprocessed txs');
        if (unprocessedTxs.length === 0) {
            self._isProcessing = false;
            return callback();
        }

        async.eachSeries(unprocessedTxs, function (unprocessedTx, asyncCallback) {

            switch (unprocessedTx.robocoin_tx_type) {
                case 'send':
                    console.log('replenishing send for ' + unprocessedTx.robocoin_xbt + ' worth $' + unprocessedTx.robocoin_fiat);
                    self._replenishAccountBtc(unprocessedTx, asyncCallback);
                    break;
                case 'forward':
                    console.log('selling ' + unprocessedTx.robocoin_xbt);
                    self._sellBtcForFiat(unprocessedTx, asyncCallback);
                    break;
                default:
                    callback('Unrecognized transaction type: ' + unprocessedTx.robocoin_tx_type);
            }
        }, function (err) {

            self._isProcessing = false;
            return callback(err);
        });
    });
};

Autoconnector.prototype._isProcessing = false;

/**
 *
 * @param callback callback(err)
 */
Autoconnector.prototype.run = function (callback) {

    var self = this;

    if (this._isProcessing) {
        console.log('Already processing, skipping this round...');
        return callback();
    }

    this._isProcessing = true;

    async.waterfall([
        function (waterfallCallback) {

            self._transactionMapper.findLastTransactionTime(waterfallCallback);
        },
        function (lastTime, waterfallCallback) {

            self._getRobocoin().getTransactions(lastTime, function (err, transactions) {
                console.log('got ' + transactions.length + ' transactions');
                if (err) return waterfallCallback('Error getting Robocoin transactions: ' + err);

                if (transactions.length === 0) {
                    self._isProcessing = false;
                    return waterfallCallback();
                }

                async.eachSeries(transactions, function (transaction, asyncCallback) {
                    console.log(transaction);
                    self._getTransactionMapper().save(transaction, asyncCallback);

                }, function (err) {

                    if (err) return waterfallCallback(err);

                    self._processUnprocessedTransactions(waterfallCallback);
                });
            });
        }
    ], callback);
};

module.exports = Autoconnector;
