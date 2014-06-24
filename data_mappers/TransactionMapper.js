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
            '`robocoin_tx_time`, `robocoin_miners_fee`, `robocoin_tx_fee`) ' +
        'VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(ROUND(?/1000)), ?, ?) ' +
        'ON DUPLICATE KEY UPDATE `confirmations` = `confirmations`',
        [robocoinTx.id, robocoinTx.action, robocoinTx.fiat, robocoinTx.xbt, robocoinTx.confirmations, robocoinTx.time,
            robocoinTx.miners_fee, robocoinTx.fee],
        callback
    );
};

TransactionMapper.prototype.saveExchangeTransaction = function (exchangeTx, callback) {

    var txTypes = ['deposit', 'withdrawal', 'market trade'];

    if (exchangeTx.exchange_tx_time !== null) {
        exchangeTx.exchange_tx_time = (new Date(exchangeTx.exchange_tx_time)).getTime();
    }

    this._getConnection().query(
        'UPDATE `transactions` ' +
        'SET ' +
            '`exchange_tx_id` = ?, ' +
            '`exchange_fiat` = ?, ' +
            '`exchange_xbt` = ?, ' +
            '`exchange_order_id` = ?, ' +
            '`exchange_tx_fee` = ?, ' +
            '`exchange_tx_time` = FROM_UNIXTIME(ROUND(?/1000)) ' +
        'WHERE `robocoin_tx_id` = ?',
        [exchangeTx.exchange_tx_id, exchangeTx.exchange_fiat, exchangeTx.exchange_xbt, exchangeTx.exchange_order_id,
            exchangeTx.exchange_tx_fee, exchangeTx.exchange_tx_time, exchangeTx.robocoin_tx_id],
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
        'WHERE (`robocoin_tx_type` = \'send\' AND `exchange_tx_time` IS NULL) ' +
            'OR (`robocoin_tx_type` = \'forward\' AND `confirmations` >= 6 AND `exchange_order_id` IS NULL)' +
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
            'DATE_FORMAT(`robocoin_tx_time`, \'%Y-%m-%d\') `date`, ' +
            '`robocoin_tx_type` `type`, ' +
            'IFNULL(SUM(`robocoin_fiat`), 0) `robocoinFiat`, ' +
            'IFNULL(SUM(`exchange_fiat`), 0) `exchangeFiat`, ' +
            'IFNULL(SUM(`robocoin_miners_fee` * (`robocoin_fiat` / `robocoin_xbt`)), 0) `robocoinMinersFee`, ' +
            'IFNULL(SUM(`exchange_miners_fee` * (ABS(`exchange_fiat`) / ABS(`exchange_xbt`))), 0) `exchangeMinersFee`, ' +
            'IFNULL(SUM(`robocoin_tx_fee` * (`robocoin_fiat` / `robocoin_xbt`)), 0) `robocoinTxFee`, ' +
            'IFNULL(SUM(`exchange_tx_fee`), 0) `exchangeTxFee` ' +
        'FROM `transactions` ' +
        'WHERE `exchange_tx_time` IS NOT NULL ' +
        'GROUP BY `date`, `robocoin_tx_type`',
        function (err, rows) {

            if (err) return callback('Error getting profit report: ' + err);

            var outputRow;
            var buys = {};
            var sells = {};
            var row;
            for (var i = 0; i < rows.length; i++) {

                row = rows[i];

                // if it's a sell...
                if (row.type == 'forward') {

                    sells[row.date] = [row.date, row.exchangeFiat - row.robocoinFiat, row.robocoinTxFee,
                        row.exchangeTxFee, row.robocoinMinersFee];

                } else if (row.type == 'send') { // or if it's a buy...

                    buys[row.date] = [row.date, row.robocoinFiat - row.exchangeFiat, row.robocoinTxFee,
                        row.exchangeTxFee, row.exchangeMinersFee];
                }
            }

            buys = Object.keys(buys).map(function (key) { return buys[key] });
            sells = Object.keys(sells).map(function (key) { return sells[key] });

            return callback(null, { buys: buys, sells: sells });
        }
    );
};

TransactionMapper.prototype.buildCashFlowReport = function (callback) {

    this._getConnection().query(
        'SELECT ' +
            'SUM(`robocoin_fiat`) `fiat`, ' +
            'IF(`robocoin_tx_type` = \'send\', \'cash in\', ' +
                'IF(`robocoin_tx_type` = \'forward\', \'cash out\', `robocoin_tx_type`)) `tx_type`, ' +
            'DATE_FORMAT(`robocoin_tx_time`, \'%m\') `month`, ' +
            'DATE_FORMAT(`robocoin_tx_time`, \'%w\') `day`, ' +
            'DATE_FORMAT(`robocoin_tx_time`, \'%H\') `hour` ' +
        'FROM `transactions` ' +
        'WHERE `robocoin_tx_time` >= DATE_SUB(NOW(), INTERVAL 1 YEAR) ' +
        'GROUP BY `tx_type`, `month`, `day`, `hour` ' +
        'ORDER BY `robocoin_tx_time`',
        function (err, rows) {

            if (err) return callback('Error getting cash flow report: ' + err);

            var hourly = {};
            var daily = {};
            var monthly = {};
            var row;

            for (var i = 0; i < rows.length; i++) {

                row = rows[i];

                if (!hourly[row.hour]) {
                    hourly[row.hour] = [row.hour, 0, 0];
                }

                if (!daily[row.day]) {
                    daily[row.day] = [row.day, 0, 0];
                }

                if (!monthly[row.month]) {
                    monthly[row.month] = [row.month, 0, 0];
                }

                if (row.tx_type == 'cash in') {

                    hourly[row.hour][1] += row.fiat;
                    daily[row.day][1] += row.fiat;
                    monthly[row.month][1] += row.fiat;

                } else if (row.tx_type == 'cash out') {

                    hourly[row.hour][2] += row.fiat;
                    daily[row.day][2] += row.fiat;
                    monthly[row.month][2] += row.fiat;
                }
            }

            hourly = Object.keys(hourly).map(function (key) { return hourly[key] });
            daily = Object.keys(daily).map(function (key) { return daily[key] });
            monthly = Object.keys(monthly).map(function (key) { return monthly[key] });

            return callback(null, {
                hourly: hourly,
                daily: daily,
                monthly: monthly
            });
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
