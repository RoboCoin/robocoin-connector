'use strict';

var Connection = require('./Connection');

var TransactionMapper = function () {
};

TransactionMapper.prototype._getConnection = function () {
    return Connection.getConnection();
};

TransactionMapper.prototype.save = function (robocoinTx, callback) {

    this._getConnection().query(
        'INSERT INTO `transactions` ' +
        '(`robocoin_id`, `robocoin_tx_type`, `robocoin_fiat`, `robocoin_xbt`, `confirmations`, `robocoin_tx_time`) ' +
        'VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(ROUND(?/1000))) ' +
        'ON DUPLICATE KEY UPDATE `confirmations` = `confirmations`',
        [robocoinTx.id, robocoinTx.action, robocoinTx.fiat, robocoinTx.xbt, robocoinTx.confirmations, robocoinTx.time],
        callback
    );
};

TransactionMapper.prototype.saveExchangeTransaction = function (exchangeTx, callback) {

    var txTypes = ['deposit', 'withdrawal', 'market trade'];
    if (exchangeTx.bitstsamp_tx_type !== null) {
        exchangeTx.bitstamp_tx_type = txTypes[exchangeTx.bitstamp_tx_type];
    }

    if (exchangeTx.bitstamp_tx_time !== null) {
        exchangeTx.bitstamp_tx_time = (new Date(exchangeTx.bitstamp_tx_time)).getTime();
    }

    this._getConnection().query(
        'UPDATE `transactions` ' +
        'SET ' +
            '`bitstamp_tx_id` = ?, ' +
            '`bitstamp_tx_type` = ?, ' +
            '`bitstamp_fiat` = ?, ' +
            '`bitstamp_xbt` = ?, ' +
            '`bitstamp_order_id` = ?, ' +
            '`bitstamp_tx_fee` = ?, ' +
            '`bitstamp_withdrawal_id` = ?, ' +
            '`bitstamp_tx_time` = ? ' +
        'WHERE `robocoin_id` = ?',
        [exchangeTx.bitstamp_tx_id, exchangeTx.bitstamp_tx_type, exchangeTx.bitstamp_fiat, exchangeTx.bitstamp_xbt,
            exchangeTx.bitstamp_order_id, exchangeTx.bitstamp_tx_fee, exchangeTx.bitstamp_withdrawal_id,
            exchangeTx.bitstamp_tx_time, exchangeTx.robocoin_id],
        function (err) {

            if (err) return callback('Error saving exchange transaction: ' + err);

            return callback();
        }
    );
};

TransactionMapper.prototype.findUnprocessed = function (callback) {

    this._getConnection().query(
        'SELECT * ' +
        'FROM `transactions` ' +
        'WHERE (`robocoin_tx_type` = \'send\' AND `bitstamp_withdrawal_id` IS NULL) ' +
            'OR (`robocoin_tx_type` = \'forward\' AND `confirmations` >= 6 AND `bitstamp_order_id` IS NULL)',
        callback
    );
};

TransactionMapper.prototype.findLastTransactionTime = function (callback) {

    this._getConnection().query(
        'SELECT UNIX_TIMESTAMP(MAX(`robocoin_tx_time`)) `last_time` FROM `transactions`',
        function (err, rows) {

            if (err) return callback('Error getting last transaction time: ' + err);

            return callback(err, rows[0].last_time);
        }
    );
};

module.exports = TransactionMapper;
