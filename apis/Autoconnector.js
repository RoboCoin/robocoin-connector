'use strict';

var Robocoin = require('./Robocoin');
var TransactionMapper = require('../data_mappers/TransactionMapper');
var async = require('async');
var config = require('../lib/Config');
var bigdecimal = require('bigdecimal');
var Exchange = require('./Exchange');
var winston = require('winston');
var ConfigMapper = require('../data_mappers/ConfigMapper');

var MARKET_PAD = 0.10;

var Autoconnector = function () {

    this._robocoin = null;
    this._transactionMapper = null;
    this._exchange = null;
    this._configMapper = null;
};

Autoconnector.prototype._getTransactionMapper = function () {

    if (this._transactionMapper === null) {
        this._transactionMapper = new TransactionMapper();
    }

    return this._transactionMapper;
};

Autoconnector.prototype._getConfigMapper = function () {

    if (this._configMapper === null) {
        this._configMapper = new ConfigMapper();
    }

    return this._configMapper;
};

Autoconnector.prototype._replenishAccountBtc = function (unprocessedTx, robocoin, exchange, callback) {

    var self = this;
    var buyOrder;

    async.waterfall([
        function (asyncCallback) {

            exchange.getLastPrice(asyncCallback);
        },
        function (lastPrice, asyncCallback) {

            lastPrice = new bigdecimal.BigDecimal(lastPrice.price);

            var price =
                lastPrice.multiply(
                    new bigdecimal.BigDecimal(1 + MARKET_PAD))
                    .setScale(2, bigdecimal.RoundingMode.DOWN());

            exchange.buy(Math.abs(unprocessedTx.robocoin_xbt), price.toPlainString(), asyncCallback);
        },
        function (fetchedBuyOrder, asyncCallback) {

            buyOrder = fetchedBuyOrder;
            robocoin.getAccountInfo(asyncCallback);
        },
        function (accountInfo, asyncCallback) {

            exchange.withdraw(
                Math.abs(unprocessedTx.robocoin_xbt),
                accountInfo.deposit_address,
                asyncCallback
            );
        },
        function (asyncCallback) {

            unprocessedTx = self._mergeExchangeWithUnprocessedTx(unprocessedTx, buyOrder);

            winston.info('we bought ' + unprocessedTx.exchange_xbt + ' BTC for $' + unprocessedTx.exchange_fiat);
            self._getTransactionMapper().saveExchangeTransaction(unprocessedTx, asyncCallback);
        }
    ], function (err, results) {

        if (err) winston.log(err);

        // never pass the error so it'll attempt to process the next unprocessed transaction
        return callback();
    });
};

Autoconnector.prototype._mergeExchangeWithUnprocessedTx = function (unprocessedTx, exchangeOrder) {

    unprocessedTx.exchange_tx_id = exchangeOrder.id;
    unprocessedTx.exchange_fiat = exchangeOrder.fiat;
    unprocessedTx.exchange_xbt = exchangeOrder.btc;
    unprocessedTx.exchange_order_id = exchangeOrder.order_id;
    unprocessedTx.exchange_tx_fee = exchangeOrder.fee;
    unprocessedTx.exchange_tx_time = exchangeOrder.datetime;

    return unprocessedTx;
};

Autoconnector.prototype._sellBtcForFiat = function (unprocessedTx, exchange, callback) {

    var self = this;

    async.waterfall([
        function (asyncCallback) {

            exchange.getLastPrice(asyncCallback);
        },
        function (lastPrice, asyncCallback) {

            lastPrice = new bigdecimal.BigDecimal(lastPrice.price);
            var price
                = lastPrice.multiply(
                    new bigdecimal.BigDecimal(1 - MARKET_PAD))
                    .setScale(2, bigdecimal.RoundingMode.DOWN());

            exchange.sell(unprocessedTx.robocoin_xbt, price.toPlainString(), asyncCallback);
        },
        function (sellOrder, asyncCallback) {

            unprocessedTx = self._mergeExchangeWithUnprocessedTx(unprocessedTx, sellOrder);

            winston.info('sold ' + unprocessedTx.exchange_xbt + ' BTC for $' + unprocessedTx.exchange_fiat);
            self._getTransactionMapper().saveExchangeTransaction(unprocessedTx, asyncCallback);
        }
    ], function (err) {

        if (err) winston.log(err);

        // never pass the error so it'll attempt to process the next unprocessed transaction
        return callback();
    });
};

Autoconnector.prototype._processUnprocessedTransactions = function (robocoin, exchange, callback) {

    var self = this;

    this._getTransactionMapper().findUnprocessed(function (err, unprocessedTxs) {

        if (unprocessedTxs.length === 0) {
            return callback();
        }

        async.eachSeries(unprocessedTxs, function (unprocessedTx, asyncCallback) {

            switch (unprocessedTx.robocoin_tx_type) {
                case 'send':
                    self._replenishAccountBtc(unprocessedTx, robocoin, exchange, asyncCallback);
                    break;
                case 'forward':
                    self._sellBtcForFiat(unprocessedTx, exchange, asyncCallback);
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

    var self = this;

    if (this._isProcessing) {
        winston.info('Already processing, skipping this round...');
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

            self._getConfigMapper().findAll(function (configErr, config) {

                if (configErr) return waterfallCallback(configErr);

                var robocoin = Robocoin.getInstance(config);
                var exchange = Exchange.get(config);

                return waterfallCallback(null, lastTime, robocoin, exchange);
            });
        },
        function (lastTime, robocoin, exchange, waterfallCallback) {

            robocoin.getTransactions(lastTime, function (err, transactions) {

                if (err) return waterfallCallback('Error getting Robocoin transactions: ' + err);

                if (transactions.length === 0) {
                    return waterfallCallback();
                }

                async.eachSeries(transactions, function (transaction, asyncCallback) {

                    self._getTransactionMapper().save(transaction, asyncCallback);

                }, function (err) {

                    if (err) return waterfallCallback(err);

                    self._processUnprocessedTransactions(robocoin, exchange, waterfallCallback);
                });
            });
        }
    ], function (err) {

        self._isProcessing = false;
        callback(err);
    });
};

Autoconnector.prototype._lastPrice = null;

Autoconnector.prototype._batchBuy = function (aggregateBuy, aggregatedBuys, depositAddress, exchange, callback) {

    var self = this;
    var lastPrice = new bigdecimal.BigDecimal(this._lastPrice);
    var price = lastPrice
        .multiply(new bigdecimal.BigDecimal(1 + MARKET_PAD))
        .setScale(2, bigdecimal.RoundingMode.DOWN())
        .toPlainString();

    async.waterfall([
        function (waterfallCallback) {

            winston.info('doing buy: ' + aggregateBuy + 'xbt for $' + price);
            exchange.buy(aggregateBuy, price, function (err, order) {

                if (err) return waterfallCallback('Exchange buy error: ' + err);

                return waterfallCallback(null, order);
            });
        },
        function (order, waterfallCallback) {

            winston.info('withdrawing ' + order.btc + 'xbt to ' + depositAddress);
            exchange.withdraw(order.btc, depositAddress, function (err) {

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

Autoconnector.prototype._batchSell = function (aggregateSell, aggregatedSells, exchange, callback) {

    var self = this;
    var lastPrice = new bigdecimal.BigDecimal(this._lastPrice);
    var price = lastPrice
        .multiply(new bigdecimal.BigDecimal(1 - MARKET_PAD))
        .setScale(2, bigdecimal.RoundingMode.DOWN())
        .toPlainString();

    async.waterfall([
        function (waterfallCallback) {

            winston.info('limit sell ' + aggregateSell + ' for ' + price);
            exchange.sell(aggregateSell, price, function (err, order) {

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

Autoconnector.prototype.batchProcess = function (unprocessedTransactions, depositAddress, exchange, callback) {

    if (unprocessedTransactions.length === 0) {
        return callback();
    }

    if (this._isProcessing) {
        winston.info('Already processing, skipping batch processing...');
        return callback();
    }

    var self = this;

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

                    if (tx.robocoin_tx_type == 'send') {

                        aggregateBuy = aggregateBuy.add(new bigdecimal.BigDecimal(tx.robocoin_xbt));
                        aggregatedBuys.push(tx);

                    } else if (tx.robocoin_tx_type == 'forward') {

                        aggregateSell = aggregateSell.add(new bigdecimal.BigDecimal(tx.robocoin_xbt));
                        aggregatedSells.push(tx);
                    }

                    if (aggregateBuy.compareTo(minimumOrder) == 1) {

                        aggregateBuy = aggregateBuy.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString();
                        self._batchBuy(aggregateBuy, aggregatedBuys, depositAddress, exchange, function (err) {

                            if (err) return eachSeriesCallback('Batch buy error: ' + err);

                            for (var i = 0; i < aggregatedBuys.length; i++) {
                                processedTransactions.push(aggregatedBuys[i].robocoin_tx_id);
                            }
                            aggregateBuy = new bigdecimal.BigDecimal(0);
                            aggregatedBuys = [];
                            return eachSeriesCallback();
                        });

                    } else if (aggregateSell.compareTo(minimumOrder) == 1) {

                        aggregateSell = aggregateSell.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString();
                        self._batchSell(aggregateSell, aggregatedSells, function (err) {

                            if (err) return eachSeriesCallback('Batch sell error: ' + err);

                            for (var i = 0; i < aggregatedSells.length; i++) {
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
