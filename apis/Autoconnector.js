'use strict';

var Robocoin = require('./Robocoin');
var TransactionMapper = require('../data_mappers/TransactionMapper');
var async = require('async');
var config = require('../lib/Config');
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

            self._getExchange().buy(Math.abs(unprocessedTx.robocoin_xbt), price.toPlainString(), asyncCallback);
        },
        function (fetchedBuyOrder, asyncCallback) {

            buyOrder = fetchedBuyOrder;
            self._getRobocoin().getAccountInfo(asyncCallback);
        },
        function (accountInfo, asyncCallback) {

            self._getExchange().withdraw(
                Math.abs(unprocessedTx.robocoin_xbt),
                accountInfo.deposit_address,
                asyncCallback
            );
        },
        function (asyncCallback) {

            unprocessedTx = self._mergeExchangeWithUnprocessedTx(unprocessedTx, buyOrder);

            console.log('we bought ' + unprocessedTx.exchange_xbt + ' BTC for $' + unprocessedTx.exchange_fiat);
            self._getTransactionMapper().saveExchangeTransaction(unprocessedTx, asyncCallback);
        }
    ], function (err, results) {

        if (err) console.log(err);

        // never pass the error so it'll attempt to process the next unprocessed transaction
        return callback();
    });
};

Autoconnector.prototype._mergeExchangeWithUnprocessedTx = function (unprocessedTx, exchangeOrder) {

    unprocessedTx.exchange_tx_id = exchangeOrder.id;
    unprocessedTx.exchange_tx_type = exchangeOrder.type;
    unprocessedTx.exchange_fiat = exchangeOrder.fiat;
    unprocessedTx.exchange_xbt = exchangeOrder.btc;
    unprocessedTx.exchange_order_id = exchangeOrder.order_id;
    unprocessedTx.exchange_tx_fee = exchangeOrder.fee;
    unprocessedTx.exchange_tx_time = exchangeOrder.datetime;

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

            self._getExchange().sell(unprocessedTx.robocoin_xbt, price.toPlainString(), asyncCallback);
        },
        function (sellOrder, asyncCallback) {

            unprocessedTx = self._mergeExchangeWithUnprocessedTx(unprocessedTx, sellOrder);

            console.log('sold ' + unprocessedTx.exchange_xbt + ' BTC for $' + unprocessedTx.exchange_fiat);
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

    console.log('running');
    var self = this;

    if (this._isProcessing) {
        console.log('Already processing, skipping this round...');
        return callback();
    }

    async.waterfall([
        function (waterfallCallback) {
            self._isProcessing = true;
            return waterfallCallback();
        },
        function (waterfallCallback) {

            self._getTransactionMapper().findLastTransactionTime(waterfallCallback);
        },
        function (lastTime, waterfallCallback) {

            self._getRobocoin().getTransactions(lastTime, function (err, transactions) {

                if (err) return waterfallCallback('Error getting Robocoin transactions: ' + err);

                if (transactions.length === 0) {
                    console.log('no robocoin txes');
                    return waterfallCallback();
                }

                async.eachSeries(transactions, function (transaction, asyncCallback) {

                    console.log('saving...');
                    self._getTransactionMapper().save(transaction, asyncCallback);

                }, function (err) {

                    if (err) return waterfallCallback(err);

                    console.log('processing unprocessed');
                    self._processUnprocessedTransactions(waterfallCallback);
                });
            });
        },
        function (waterfallCallback) {
            self._isProcessing = false;
            return waterfallCallback();
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
            self._getExchange().buy(aggregateBuy, price, function (err, order) {

                if (err) return waterfallCallback('Exchange buy error: ' + err);

                return waterfallCallback(null, order);
            });
        },
        function (order, waterfallCallback) {

            console.log('withdrawing ' + order.btc + 'xbt to ' + depositAddress);
            self._getExchange().withdraw(order.btc, depositAddress, function (err) {

                if (err) return waterfallCallback('Exchange withdraw error: ' + err);

                return waterfallCallback(null, order);
            });
        },
        function (order, waterfallCallback) {

            async.eachSeries(aggregatedBuys, function (tx, seriesCallback) {

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
            self._getExchange().sell(aggregateSell, price, function (err, order) {

                if (err) return waterfallCallback('Exchange sell error: ' + err);

                return waterfallCallback(null, order);
            });
        },
        function (order, waterfallCallback) {

            async.eachSeries(aggregatedSells, function (tx, seriesCallback) {

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
    tx.exchange_xbt = tx.robocoin_xbt;

    var robocoinTxXbt = new bigdecimal.BigDecimal(tx.robocoin_xbt);
    var exchangeBtc = new bigdecimal.BigDecimal(exchangeTx.btc);
    var exchangeFiat = new bigdecimal.BigDecimal(exchangeTx.fiat);

    var txFiat = robocoinTxXbt
        .divide(exchangeBtc, bigdecimal.MathContext.DECIMAL128())
        .multiply(exchangeFiat)
        .setScale(2, bigdecimal.RoundingMode.DOWN())
        .toPlainString();
    tx.exchange_fiat = txFiat;

    this._getTransactionMapper().saveExchangeTransaction(tx, function (err) {

        if (err) return callback('Error saving transaction: ' + err);

        return callback();
    });
};

Autoconnector.prototype.batchProcess = function (unprocessedTransactions, depositAddress, callback) {

    console.log('batch processing');
    if (unprocessedTransactions.length === 0) {
        return callback();
    }

    if (this._isProcessing) {
        console.log('Already processing, skipping batch processing...');
        return callback();
    }

    var self = this;
    var exchange = this._getExchange();

    async.waterfall([
        function (waterfallCallback) {
            self._isProcessing = true;
            return waterfallCallback();
        },
        function (waterfallCallback) {
            exchange.getMinimumOrder(waterfallCallback);
        },
        function (minimumOrder, waterfallCallback) {

            exchange.getLastPrice(function (err, lastPrice) {

                if (err) return waterfallCallback('Error getting last price from exchange: ' + err);

                self._lastPrice = lastPrice.price;
                var aggregateBuy = new bigdecimal.BigDecimal(0);
                var aggregatedBuys = [];
                var aggregateSell = new bigdecimal.BigDecimal(0);
                var aggregatedSells = [];
                var processedTransactions = [];
                minimumOrder = new bigdecimal.BigDecimal(minimumOrder.minimumOrder);

                async.eachSeries(unprocessedTransactions, function (tx, eachSeriesCallback) {

                    console.log('processing tx: ' + tx.robocoin_tx_id + ' for ' + tx.robocoin_xbt);
                    if (tx.robocoin_tx_type == 'send') {

                        aggregateBuy = aggregateBuy.add(new bigdecimal.BigDecimal(tx.robocoin_xbt));
                        aggregatedBuys.push(tx);

                    } else if (tx.robocoin_tx_type == 'forward') {

                        aggregateSell = aggregateSell.add(new bigdecimal.BigDecimal(tx.robocoin_xbt));
                        aggregatedSells.push(tx);
                    }

                    console.log('minimumOrder: ' + minimumOrder);
                    console.log('aggregateBuy: ' + aggregateBuy.toPlainString());
                    console.log('aggregateSell: ' + aggregateSell.toPlainString());
                    if (aggregateBuy.compareTo(minimumOrder) == 1) {

                        console.log('we\'re above minimum buy');
                        aggregateBuy = aggregateBuy.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString();
                        self._batchBuy(aggregateBuy, aggregatedBuys, depositAddress, function (err) {

                            if (err) return eachSeriesCallback('Batch buy error: ' + err);

                            for (var i = 0; i < aggregatedBuys.length; i++) {
                                console.log('processed: ' + aggregatedBuys[i].robocoin_tx_id);
                                processedTransactions.push(aggregatedBuys[i].robocoin_tx_id);
                            }
                            aggregateBuy = new bigdecimal.BigDecimal(0);
                            aggregatedBuys = [];
                            return eachSeriesCallback();
                        });

                    } else if (aggregateSell.compareTo(minimumOrder) == 1) {

                        console.log('we\'re above minimum sell');
                        aggregateSell = aggregateSell.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString();
                        self._batchSell(aggregateSell, aggregatedSells, function (err) {

                            if (err) return eachSeriesCallback('Batch sell error: ' + err);

                            for (var i = 0; i < aggregatedSells.length; i++) {
                                console.log('processed: ' + aggregatedSells[i].robocoin_tx_id);
                                processedTransactions.push(aggregatedSells[i].robocoin_tx_id);
                            }
                            aggregateSell = new bigdecimal.BigDecimal(0);
                            aggregatedSells = [];
                            return eachSeriesCallback();
                        });

                    } else {

                        return eachSeriesCallback();
                    }

                }, function (err) {

                    return waterfallCallback(err, processedTransactions);
                });
            });
        },
        function (processedTransactions, waterfallCallback) {
            self._isProcessing = false;
            return waterfallCallback(null, processedTransactions);
        }
    ], callback);
};

module.exports = Autoconnector;
