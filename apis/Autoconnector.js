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
