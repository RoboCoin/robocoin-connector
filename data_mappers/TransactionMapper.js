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
        '(`robocoin_tx_id`, `robocoin_tx_type`, `robocoin_fiat`, `robocoin_xbt`, `confirmations`, ' +
            '`robocoin_tx_time`, `robocoin_miners_fee`) ' +
        'VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(ROUND(?/1000)), ?) ' +
        'ON DUPLICATE KEY UPDATE `confirmations` = `confirmations`',
        [robocoinTx.id, robocoinTx.action, robocoinTx.fiat, robocoinTx.xbt, robocoinTx.confirmations, robocoinTx.time,
            robocoinTx.minersFee],
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
            '`bitstamp_tx_time` = FROM_UNIXTIME(ROUND(?/1000)) ' +
        'WHERE `robocoin_tx_id` = ?',
        [exchangeTx.bitstamp_tx_id, exchangeTx.bitstamp_tx_type, exchangeTx.bitstamp_fiat, exchangeTx.bitstamp_xbt,
            exchangeTx.bitstamp_order_id, exchangeTx.bitstamp_tx_fee, exchangeTx.bitstamp_withdrawal_id,
            exchangeTx.bitstamp_tx_time, exchangeTx.robocoin_tx_id],
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
        'WHERE (`robocoin_tx_type` = \'send\' AND `bitstamp_tx_time` IS NULL) ' +
            'OR (`robocoin_tx_type` = \'forward\' AND `confirmations` >= 6 AND `bitstamp_order_id` IS NULL)' +
        'ORDER BY `robocoin_tx_time`',
        function (err, rows) {
            return callback(err, rows);
        }
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

TransactionMapper.prototype.buildProfitReport = function (callback) {

    this._getConnection().query(
        'SELECT ' +
            'DATE_FORMAT(`robocoin_tx_time`, \'%Y-%m\') `date`, ' +
            '`robocoin_tx_type` `type`, ' +
            'SUM(ABS(`robocoin_fiat`)) `robocoinFiat`, ' +
            'SUM(ABS(`bitstamp_fiat`)) `bitstampFiat`, ' +
            'SUM(`robocoin_miners_fee`) `robocoinMinersFee`, ' +
            'SUM(`bitstamp_miners_fee`) `bitstampMinersFee`, ' +
            'SUM(`robocoin_tx_fee`) `robocoinTxFee`, ' +
            'SUM(`bitstamp_tx_fee`) `bitstampTxFee` ' +
        'FROM `transactions` ' +
        'WHERE `bitstamp_tx_time` IS NOT NULL ' +
        'GROUP BY `date`, `robocoin_tx_type`',
        function (err, rows) {

            if (err) return callback('Error getting profit report: ' + err);

            var outputRows = {};
            var outputRow;
            var row;
            for (var i = 0; i < rows.length; i++) {

                row = rows[i];
                if (!outputRows[row.date]) {
                    outputRows[row.date] = [row.date];
                }

                // if it's a sell...
                if (row.type == 'forward') {

                    outputRows[row.date][1] = row.robocoinFiat;
                    outputRows[row.date][2] = row.bitstampTxFee;
                    outputRows[row.date][3] = row.robocoinTxFee;
                    outputRows[row.date][4] = row.robocoinMinersFee;

                } else if (row.type == 'send') { // or if it's a buy...

                    outputRows[row.date][5] = row.robocoinFiat;
                    outputRows[row.date][6] = row.bitstampTxFee;
                    outputRows[row.date][7] = row.robocoinTxFee;
                    outputRows[row.date][8] = row.bitstampMinersFee;
                }
            }

            outputRows = Object.keys(outputRows).map(function (key) { return outputRows[key] });

            return callback(null, outputRows);
        }
    );
};

TransactionMapper.prototype.findAllByIds = function (ids, callback) {

    this._getConnection().query(
        'SELECT * FROM `transactions` WHERE `robocoin_tx_id` IN (?)',
        [ids],
        function (err, rows) {

            if (err) return callback('Error finding all transactions by IDs: ' + err);

            return callback(null, rows);
        }
    );

    // TODO handle when some orders aren't found, e.g. input count doesn't match output count
};

module.exports = TransactionMapper;
