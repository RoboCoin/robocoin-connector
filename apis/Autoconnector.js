'use strict';

var Robocoin = require('./Robocoin');
var TransactionMapper = require('../data_mappers/TransactionMapper');
var async = require('async');

var Autoconnector = function () {

    this._robocoin = null;
    this._transactionMapper = null;
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

Autoconnector.prototype.isCandidateTransaction = function (robocoinTx, bitstampTx) {

    if (Math.abs(robocoinTx.xbt) != Math.abs(bitstampTx.btc)) {
        return false;
    }

    var oneHour = (1000 * 60 * 60);
    var bitstampTransactionTime = (new Date(bitstampTx.datetime)).getTime();

    if (bitstampTransactionTime < (robocoinTx.time - oneHour)) {
        return false;
    }

    if (bitstampTransactionTime > (robocoinTx.time + oneHour)) {
        return false;
    }

    return true;
};

Autoconnector.prototype.getIndexOfBestCandidate = function (robocoinTxs, bitstampTxs) {

    var bestCandidateIndex;
    var nearestDistance;
    var date;
    var thisDistance;

    for (var i = 0; i < bitstampTxs.length; i++) {

        date = new Date(bitstampTxs[i].datetime);

        if (i === 0) {

            bestCandidateIndex = 0;
            nearestDistance = Math.abs(robocoinTxs.time - (date.getTime()));

        } else {

            thisDistance = Math.abs(robocoinTxs.time - (date.getTime()));

            if (thisDistance < nearestDistance) {
                bestCandidateIndex = i;
                nearestDistance = thisDistance;
            }
        }
    }

    return bestCandidateIndex;
};

Autoconnector.prototype.run = function (callback) {

    var self = this;

    this._getRobocoin().getTransactions(function (err, transactions) {

        if (err) return callback(err);

        async.eachSeries(transactions, function (transaction, asyncCallback) {

            self._getTransactionMapper().save(transaction, asyncCallback);

        }, function (err) {

            if (err) return callback(err);

            return callback();
        });
    });
};

module.exports = Autoconnector;
