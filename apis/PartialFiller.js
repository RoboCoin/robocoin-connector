'use strict';

var TransactionMapper = require('../data_mappers/TransactionMapper');
var Autoconnector = require('./Autoconnector');
var ConfigMapper = require('../data_mappers/ConfigMapper');
var Robocoin = require('./Robocoin');
var winston = require('winston');

var PartialFiller = function () {

    this._transactionMapper = null;
    this._autoconnector = null;
    this._configMapper = null;
    this._isProcessing = false;
};

PartialFiller.prototype._getTransactionMapper = function () {

    if (this._transactionMapper === null) {
        this._transactionMapper = new TransactionMapper();
    }

    return this._transactionMapper;
};

PartialFiller.prototype._getAutoconnector = function () {

    if (this._autoconnector === null) {
        this._autoconnector = new Autoconnector();
    }

    return this._autoconnector;
};

PartialFiller.prototype._getConfigMapper = function () {

    if (this._configMapper === null) {
        this._configMapper = new ConfigMapper();
    }

    return this._configMapper;
};

PartialFiller.prototype.run = function (callback) {

    if (this._isProcessing) {
        winston.info('Already partial filling, skipping...');
        return callback();
    }

    var self = this;
    this._isProcessing = true;

    this._getTransactionMapper().findPartialFilled(function (err, partials) {

        if (err) {
            this._isProcessing = false;
            return callback('Error finding partials: ' + err);
        }

        self._getConfigMapper().findAll(function (configErr, config) {

            if (configErr) {
                this._isProcessing = false;
                return callback('Error getting config: ' + configErr);
            }

            var robocoin = Robocoin.getInstance(config);

            self._getAutoconnector().processTransactions(partials, robocoin, function (err) {

                if (err) {
                    winston.error('Error processing partials: ' + err);
                }

                self._isProcessing = false;
                return callback(err);
            });
        });
    });
};

module.exports = PartialFiller;
