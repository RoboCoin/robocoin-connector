'use strict';

var Robocoin = require('./Robocoin');
var TransactionMapper = require('../data_mappers/TransactionMapper');
var async = require('async');
var config = require('../lib/Config');
var bigdecimal = require('bigdecimal');
var Exchange = require('./Exchange');
var winston = require('winston');
var ConfigMapper = require('../data_mappers/ConfigMapper');
var Blockchain = require('./Blockchain');
var RobocoinTxTypes = require('../lib/RobocoinTxTypes');

var MARKET_PAD = 0.05;

var Autoconnector = function () {

    this._robocoin = null;
    this._transactionMapper = null;
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

            // get the price of bitcoin
            exchange.getPrices(asyncCallback);
        },
        function (prices, asyncCallback) {

            // pad the price and place the order
            price = new bigdecimal.BigDecimal(prices.buyPrice);

            var price =
                price.multiply(
                    new bigdecimal.BigDecimal(1 + MARKET_PAD))
                    .setScale(2, bigdecimal.RoundingMode.DOWN());
            exchange.buy(Math.abs(unprocessedTx.robocoin_xbt), price.toPlainString(), asyncCallback);
        },
        function (fetchedBuyOrder, asyncCallback) {

            // get the executed order and get account info for the withdraw address
            buyOrder = fetchedBuyOrder;
            robocoin.getAccountInfo(asyncCallback);
        },
        function (accountInfo, asyncCallback) {

            // do the withdrawal
            exchange.withdraw(
                Math.abs(unprocessedTx.robocoin_xbt),
                accountInfo.depositAddress,
                asyncCallback
            );
        },
        function (asyncCallback) {

            // merge the exchange with the robocoin transaction and save it
            unprocessedTx = self._mergeExchangeWithUnprocessedTx(unprocessedTx, buyOrder);

            winston.info('we bought ' + unprocessedTx.exchange_xbt + ' BTC for $' + unprocessedTx.exchange_fiat);
            self._getTransactionMapper().saveExchangeTransaction(unprocessedTx, asyncCallback);
        }
    ], function (err, results) {

        if (err) winston.error(err);

        // never pass the error so it'll attempt to process the next unprocessed transaction
        return callback();
    });
};

Autoconnector.prototype._mergeExchangeWithUnprocessedTx = function (unprocessedTx, exchangeOrder) {

    unprocessedTx.exchange_tx_id = exchangeOrder.id;
    unprocessedTx.exchange_fiat = exchangeOrder.fiat;
    unprocessedTx.exchange_xbt = exchangeOrder.xbt;
    unprocessedTx.exchange_tx_fee = exchangeOrder.fee;
    unprocessedTx.exchange_tx_time = exchangeOrder.datetime;

    return unprocessedTx;
};

Autoconnector.prototype._sellBtcForFiat = function (unprocessedTx, exchange, robocoin, callback) {

    var self = this;

    async.series([
        function (seriesCallback) {
            robocoin.getHashFor(unprocessedTx.tx_hash, function (err, hash) {
                if (err) return seriesCallback(err);
                unprocessedTx.tx_hash = hash;
                return seriesCallback();
            });
        },
        function (seriesCallback) {

            var blockchain = new Blockchain();
            blockchain.getConfirmationsForTransaction(unprocessedTx.tx_hash, function (err, confirmations) {

                if (err) {
                    winsont.error('Error getting confirmations: ' + err);
                    // log the error but continue processing
                    return seriesCallback();
                }

                winston.info('confirmations: ' + confirmations);
                // TODO get this from the exchange class, e.g. exchange.getDepositConfirmationsRequired or whatever
                // also, maybe make that call async, i.e. e.blah(callback), in case it's ever not a constant
                if (confirmations < 6) {

                    winston.info('Confirmations at ' + confirmations + ', skipping');
                    return seriesCallback();

                } else {

                    winston.info('got enough confirmations, processing...');
                    async.waterfall([
                        function (asyncCallback) {

                            exchange.getPrices(asyncCallback);
                        },
                        function (prices, asyncCallback) {

                            var price = new bigdecimal.BigDecimal(prices.sellPrice);
                            price = price.multiply(
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

                        if (err) winston.error(err);

                        // never pass the error so it'll attempt to process the next unprocessed transaction
                        return seriesCallback();
                    });
                }
            });
        }
    ], callback);
};

Autoconnector.prototype._processUnprocessedTransactions = function (robocoin, callback) {

    var self = this;

    this._getTransactionMapper().findUnprocessed(function (err, unprocessedTxs) {

        if (unprocessedTxs.length === 0) {
            return callback();
        }

        var exchange;
        var kioskConfig;

        async.eachSeries(unprocessedTxs, function (unprocessedTx, asyncCallback) {

            self._getConfigMapper().findAll(function (err, config) {

                if (err) return asyncCallback(err);

                kioskConfig = config.getAllForKiosk(unprocessedTx.kiosk_id);
                unprocessedTx.exchangeClass = kioskConfig.exchangeClass;
                exchange = Exchange.get(kioskConfig);

                switch (unprocessedTx.robocoin_tx_type) {
                    case RobocoinTxTypes.SEND:
                        self._replenishAccountBtc(unprocessedTx, robocoin, exchange, asyncCallback);
                        break;
                    case RobocoinTxTypes.RECV:
                        self._sellBtcForFiat(unprocessedTx, exchange, robocoin, asyncCallback);
                        break;
                    default:
                        callback('Unrecognized transaction type: ' + unprocessedTx.robocoin_tx_type);
                }
            });

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

                return waterfallCallback(null, lastTime, robocoin);
            });
        },
        function (lastTime, robocoin, waterfallCallback) {

            robocoin.getTransactions((new Date(lastTime)).getTime() + 1000, function (err, transactions) {

                if (err) return waterfallCallback('Error getting Robocoin transactions: ' + err);

                if (transactions.length === 0) {
                    winston.info('No transactions to process on this round.');
                    return waterfallCallback(null, robocoin);
                }

                async.eachSeries(transactions, function (transaction, asyncCallback) {

                    self._getTransactionMapper().save(transaction, asyncCallback);

                }, function (err) {

                    return waterfallCallback(err, robocoin);
                });
            });
        },
        function (robocoin, waterfallCallback) {

            self._processUnprocessedTransactions(robocoin, waterfallCallback);
        }
    ], function (err) {

        self._isProcessing = false;
        return callback(err);
    });
};

Autoconnector.prototype._lastBuyPrice = null;
Autoconnector.prototype._lastSellPrice = null;

Autoconnector.prototype._batchBuy = function (aggregateBuy, aggregatedBuys, depositAddress, exchange, callback) {

    var self = this;
    var lastPrice = new bigdecimal.BigDecimal(this._lastBuyPrice);
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

            winston.info('withdrawing ' + order.xbt + 'xbt to ' + depositAddress);
            exchange.withdraw(order.xbt, depositAddress, function (err) {

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
    var lastPrice = new bigdecimal.BigDecimal(this._lastSellPrice);
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
    var exchangeBtc = new bigdecimal.BigDecimal(exchangeTx.xbt);
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

    var txesByKioskId = {};
    var unprocessedTx;
    for (var i = 0; i < unprocessedTransactions.length; i++) {

        unprocessedTx = unprocessedTransactions[i];

        if (!txesByKioskId[unprocessedTx.kiosk_id]) {
            txesByKioskId[unprocessedTx.kiosk_id] = [];
        }

        txesByKioskId[unprocessedTx.kiosk_id].push(unprocessedTx);
    }

    var kioskIds = Object.keys(txesByKioskId);
    var exchange;
    var self = this;

    this._getConfigMapper().findAll(function (err, config) {

        if (err) return callback(err);

        var kioskConfig;

        async.each(kioskIds, function (kioskId, asyncCallback) {

            kioskConfig = config.getAllForKiosk(kioskId);

            for (var i = 0; i < txesByKioskId[kioskId].length; i++) {
                txesByKioskId[kioskId][i].exchangeClass = kioskConfig.exchangeClass;
            }

            exchange = Exchange.get(kioskConfig);
            self._doBatchProcess(txesByKioskId[kioskId], depositAddress, exchange, asyncCallback);

        }, callback);
    });
};

Autoconnector.prototype._doBatchProcess = function (unprocessedTransactions, depositAddress, exchange, callback) {

    if (unprocessedTransactions.length <= 1) {
        winston.info('Only one unprocessed transaction, no need to process...');
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
            exchange.getMinimumOrders(waterfallCallback);
        },
        function (minimumOrder, waterfallCallback) {

            // assuming only a couple of small orders that, combined, won't move the market, let's use one price for
            // the whole batch
            exchange.getPrices(function (err, price) {

                if (err) return waterfallCallback('Error getting last price from exchange: ' + err);

                self._lastBuyPrice = price.buyPrice;
                self._lastSellPrice = price.sellPrice;
                var aggregateBuy = new bigdecimal.BigDecimal.ZERO();
                var aggregatedBuys = [];
                var aggregateSell = new bigdecimal.BigDecimal.ZERO();
                var aggregatedSells = [];
                var processedTransactions = [];
                var minimumBuy = new bigdecimal.BigDecimal(minimumOrder.minimumBuy);
                var minimumSell = new bigdecimal.BigDecimal(minimumOrder.minimumSell);
                var aggregateBuyAsNumber;
                var aggregateSellAsNumber;

                async.eachSeries(unprocessedTransactions, function (tx, eachSeriesCallback) {

                    if (tx.robocoin_tx_type == RobocoinTxTypes.SEND) {

                        aggregateBuy = aggregateBuy.add(new bigdecimal.BigDecimal(tx.robocoin_xbt));
                        aggregatedBuys.push(tx);

                    } else if (tx.robocoin_tx_type == RobocoinTxTypes.RECV) {

                        aggregateSell = aggregateSell.add(new bigdecimal.BigDecimal(tx.robocoin_xbt));
                        aggregatedSells.push(tx);
                    }

                    if (aggregateBuy.compareTo(minimumBuy) == 1) {

                        aggregateBuyAsNumber = aggregateBuy.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString();
                        self._batchBuy(aggregateBuyAsNumber, aggregatedBuys, depositAddress, exchange, function (err) {

                            if (err) {
                                // on error, just skip to the next
                                winston.error('Batch buy error: ' + err);
                                return eachSeriesCallback();
                            }

                            for (var i = 0; i < aggregatedBuys.length; i++) {
                                processedTransactions.push(aggregatedBuys[i].robocoin_tx_id);
                            }
                            aggregateBuy = new bigdecimal.BigDecimal(0);
                            aggregatedBuys = [];
                            return eachSeriesCallback();
                        });

                    } else if (aggregateSell.compareTo(minimumSell) == 1) {

                        aggregateSellAsNumber = aggregateSell.setScale(8, bigdecimal.RoundingMode.DOWN()).toPlainString();
                        self._batchSell(aggregateSellAsNumber, aggregatedSells, exchange, function (err) {

                            if (err) {
                                // on error, just skip to the next
                                winston.error('Batch sell error: ' + err);
                                return eachSeriesCallback();
                            }

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
        }
    ], function (err, processedTransactions) {

        self._isProcessing = false;
        return callback(err, processedTransactions);
    });
};

module.exports = Autoconnector;
