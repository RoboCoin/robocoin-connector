'use strict';

var Robocoin = require('./Robocoin');
var TransactionMapper = require('../data_mappers/TransactionMapper');
var async = require('async');
var config = require('../../connectorConfig');
var bigdecimal = require('bigdecimal');
var Exchange = require('./Exchange');

var MARKET_PAD = 0.10;

var Autoconnector = function () {

    this._robocoin = null;
    this._transactionMapper = null;
    this._exchange = null;
};

Autoconnector.prototype._getRobocoin = function () {

    if (this._robocoin === null) {
        this._robocoin = Robocoin.getInstance();
    }

    return this._robocoin;
};

Autoconnector.prototype._getTransactionMapper = function () {

    if (this._transactionMapper === null) {
        this._transactionMapper = new TransactionMapper();
    }

    return this._transactionMapper;
};

Autoconnector.prototype._getExchange = function () {

    if (this._exchange === null) {
        this._exchange = Exchange.get(config.exchangeClass);
    }

    return this._exchange;
};

Autoconnector.prototype._replenishAccountBtc = function (unprocessedTx, callback) {

    var self = this;
    var buyOrder;

    async.waterfall([
        function (asyncCallback) {

            self._getExchange().getLastPrice(asyncCallback);
        },
        function (lastPrice, asyncCallback) {

            lastPrice = new bigdecimal.BigDecimal(lastPrice.price);
            var price =
                lastPrice.multiply(
                    new bigdecimal.BigDecimal(1 + MARKET_PAD))
                    .setScale(2, bigdecimal.RoundingMode.DOWN());

            self._getExchange().buyLimit(Math.abs(unprocessedTx.robocoin_xbt), price.toPlainString(), asyncCallback);
        },
        function (fetchedBuyOrder, asyncCallback) {

            buyOrder = fetchedBuyOrder;
            self._getRobocoin().getAccountInfo(asyncCallback);
        },
        function (accountInfo, asyncCallback) {

            self._getExchange().withdraw(
                Math.abs(unprocessedTx.robocoin_xbt),
                accountInfo.depositAddress,
                asyncCallback
            );
        },
        function (withdraw, asyncCallback) {

            unprocessedTx.bitstamp_withdrawal_id = withdraw.id;
            unprocessedTx = self._mergeExchangeWithUnprocessedTx(unprocessedTx, buyOrder);

            console.log('we bought ' + unprocessedTx.bitstamp_xbt + ' BTC for $' + unprocessedTx.bitstamp_fiat);
            self._getTransactionMapper().saveExchangeTransaction(unprocessedTx, asyncCallback);
        }
    ], function (err, results) {

        if (err) console.log(err);

        // never pass the error so it'll attempt to process the next unprocessed transaction
        return callback();
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

            self._getExchange().getLastPrice(asyncCallback);
        },
        function (lastPrice, asyncCallback) {

            lastPrice = new bigdecimal.BigDecimal(lastPrice.price);
            var price
                = lastPrice.multiply(
                    new bigdecimal.BigDecimal(1 - MARKET_PAD))
                    .setScale(2, bigdecimal.RoundingMode.DOWN());

            self._getExchange().sellLimit(unprocessedTx.robocoin_xbt, price.toPlainString(), asyncCallback);
        },
        function (sellOrder, asyncCallback) {

            unprocessedTx = self._mergeExchangeWithUnprocessedTx(unprocessedTx, sellOrder);

            console.log('sold ' + unprocessedTx.bitstamp_xbt + ' BTC for $' + unprocessedTx.bitstamp_fiat);
            self._getTransactionMapper().saveExchangeTransaction(unprocessedTx, asyncCallback);
        }
    ], function (err) {

        if (err) console.log(err);

        // never pass the error so it'll attempt to process the next unprocessed transaction
        return callback();
    });
};

Autoconnector.prototype._processUnprocessedTransactions = function (callback) {

    var self = this;

    this._getTransactionMapper().findUnprocessed(function (err, unprocessedTxs) {

        if (unprocessedTxs.length === 0) {
            self._isProcessing = false;
            return callback();
        }

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

            self._getTransactionMapper().findLastTransactionTime(waterfallCallback);
        },
        function (lastTime, waterfallCallback) {

            self._getRobocoin().getTransactions(lastTime, function (err, transactions) {

                if (err) return waterfallCallback('Error getting Robocoin transactions: ' + err);

                if (transactions.length === 0) {
                    self._isProcessing = false;
                    return waterfallCallback();
                }

                async.eachSeries(transactions, function (transaction, asyncCallback) {

                    self._getTransactionMapper().save(transaction, asyncCallback);

                }, function (err) {

                    if (err) return waterfallCallback(err);

                    self._processUnprocessedTransactions(waterfallCallback);
                });
            });
        }
    ], callback);
};

Autoconnector.prototype._lastPrice = null;

Autoconnector.prototype._batchBuy = function (aggregateBuy, aggregatedBuys, depositAddress, callback) {

    var self = this;
    var lastPrice = new bigdecimal.BigDecimal(this._lastPrice);
    var price = lastPrice
        .multiply(new bigdecimal.BigDecimal(1 + MARKET_PAD))
        .setScale(2, bigdecimal.RoundingMode.DOWN())
        .toPlainString();

    async.waterfall([
        function (waterfallCallback) {

            console.log('doing buy: ' + aggregateBuy + 'xbt for $' + price);
            self._getExchange().buyLimit(aggregateBuy, price, function (err, order) {

                if (err) return waterfallCallback('Exchange buy error: ' + err);

                return waterfallCallback(null, order);
            });
        },
        function (order, waterfallCallback) {

            console.log('withdrawing ' + order.btc + 'xbt to ' + depositAddress);
            self._getExchange().withdraw(order.btc, depositAddress, function (err, withdrawal) {

                if (err) return waterfallCallback('Exchange withdraw error: ' + err);

                return waterfallCallback(null, withdrawal, order);
            });
        },
        function (withdrawal, order, waterfallCallback) {

            async.eachSeries(aggregatedBuys, function (tx, seriesCallback) {

                console.log('saving buy: ');
                tx.withdraw_id = withdrawal.withdraw_id;
                console.log(' ' + tx.robocoin_tx_id);
                self._saveTransaction(tx, order, seriesCallback);

            }, function (err) {

                if (err) return waterfallCallback('Error saving transactions: ' + err);

                return waterfallCallback();
            });
        }
    ], function (err) {

        if (err) return callback('Batch buy error: ' + err);

        return callback();
    });
};

Autoconnector.prototype._batchSell = function (aggregateSell, aggregatedSells, callback) {

    var self = this;
    var lastPrice = new bigdecimal.BigDecimal(this._lastPrice);
    var price = lastPrice
        .multiply(new bigdecimal.BigDecimal(1 - MARKET_PAD))
        .setScale(2, bigdecimal.RoundingMode.DOWN())
        .toPlainString();

    async.waterfall([
        function (waterfallCallback) {

            console.log('limit sell ' + aggregateSell + ' for ' + price);
            self._getExchange().sellLimit(aggregateSell, price, function (err, order) {

                console.log('okay, sell is done');
                console.log('err: ' + err);
                if (err) return waterfallCallback('Exchange sell error: ' + err);
                console.log('about to call waterfall callback successfully');
                return waterfallCallback(null, order);
            });
        },
        function (order, waterfallCallback) {

            console.log('about to save the txes');
            async.eachSeries(aggregatedSells, function (tx, seriesCallback) {

                console.log('saving tx...');
                self._saveTransaction(tx, order, seriesCallback);

            }, function (err) {

                if (err) return waterfallCallback('Error saving transactions: ' + err);

                return waterfallCallback();
            });
        }
    ], function (err) {

        if (err) return callback('Batch sell error: ' + err);

        return callback();
    });
};

Autoconnector.prototype._saveTransaction = function (tx, exchangeTx, callback) {

    tx = this._mergeExchangeWithUnprocessedTx(tx, exchangeTx);
    // this transaction isn't for the whole purchase, just the amount tied to the Robocoin transaction
    tx.bitstamp_xbt = tx.robocoin_xbt;

    var robocoinTxXbt = new bigdecimal.BigDecimal(tx.robocoin_xbt);
    var exchangeBtc = new bigdecimal.BigDecimal(exchangeTx.btc);
    var exchangeFiat = new bigdecimal.BigDecimal(exchangeTx.usd);

    var txFiat = robocoinTxXbt
        .divide(exchangeBtc, bigdecimal.MathContext.DECIMAL128())
        .multiply(exchangeFiat)
        .setScale(2, bigdecimal.RoundingMode.DOWN())
        .toPlainString();
    tx.bitstamp_fiat = txFiat;

    this._getTransactionMapper().saveExchangeTransaction(tx, function (err) {

        if (err) return callback('Error saving transaction: ' + err);

        return callback();
    });
};

Autoconnector.prototype.batchProcess = function (unprocessedTransactions, depositAddress, callback) {

    if (unprocessedTransactions.length == 0) {
        return callback();
    }

    if (this._isProcessing) {
        console.log('Already processing, skipping batch processing...');
        return callback();
    }

    this._isProcessing = true;

    var self = this;
    var exchange = this._getExchange();
    var exchangeMinimumOrder = exchange.getMinimumOrder();

    exchange.getLastPrice(function (err, lastPrice) {

        if (err) return callback('Error getting last price from exchange: ' + err);

        self._lastPrice = lastPrice.price;
        var aggregateBuy = 0;
        var aggregatedBuys = [];
        var aggregateSell = 0;
        var aggregatedSells = [];
        var processedTransactions = [];

        async.eachSeries(unprocessedTransactions, function (tx, asyncCallback) {

            console.log('processing tx: ' + tx.robocoin_tx_id + ' for ' + tx.robocoin_xbt);
            if (tx.robocoin_tx_type == 'send') {

                aggregateBuy += tx.robocoin_xbt;
                aggregatedBuys.push(tx);

            } else if (tx.robocoin_tx_type == 'forward') {

                aggregateSell += tx.robocoin_xbt;
                aggregatedSells.push(tx);
            }

            console.log('minimum order: ' + exchangeMinimumOrder);
            console.log('aggregateBuy: ' + aggregateBuy);
            console.log('aggregateSell: ' + aggregateSell);
            if (aggregateBuy >= exchangeMinimumOrder) {

                console.log('we\'re above minimum buy');
                self._batchBuy(aggregateBuy, aggregatedBuys, depositAddress, function (err) {

                    if (err) return asyncCallback('Batch buy error: ' + err);

                    for (var i = 0; i < aggregatedBuys.length; i++) {
                        console.log('processed: ' + aggregatedBuys[i].robocoin_tx_id);
                        processedTransactions.push(aggregatedBuys[i].robocoin_tx_id);
                    }
                    aggregateBuy = 0;
                    aggregatedBuys = [];
                    return asyncCallback();
                });

            } else if (aggregateSell >= exchangeMinimumOrder) {

                console.log('we\'re above minimum sell');
                self._batchSell(aggregateSell, aggregatedSells, function (err) {

                    if (err) return asyncCallback('Batch sell error: ' + err);

                    for (var i = 0; i < aggregatedSells.length; i++) {
                        console.log('processed: ' + aggregatedSells[i].robocoin_tx_id);
                        processedTransactions.push(aggregatedSells[i].robocoin_tx_id);
                    }
                    aggregateSell = 0;
                    aggregatedSells = [];
                    return asyncCallback();
                });

            } else {

                return asyncCallback();
            }

        }, function (err) {

            self._isProcessing = false;

            return callback(err, processedTransactions);
        });
    });
};

module.exports = Autoconnector;
