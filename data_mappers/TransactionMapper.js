'use strict';

var Connection = require('./PgConnection');

var TransactionMapper = function () {
};

TransactionMapper.prototype.save = function (robocoinTx, callback) {

    var query = Connection.getConnection().query;

    query(
        'UPDATE transactions SET confirmations = $1 WHERE robocoin_tx_id = $2',
        [robocoinTx.confirmations, robocoinTx.id],
        function (err, res) {

            if (err) return callback('Error updating confirmations: ' + err);

            if (res.rowCount === 0) {

                robocoinTx.time = (new Date(robocoinTx.time)).toUTCString();

                var params = [robocoinTx.id, robocoinTx.action, robocoinTx.fiat, robocoinTx.xbt,
                    robocoinTx.confirmations, robocoinTx.time, robocoinTx.miners_fee, robocoinTx.fee];

                query(
                    'INSERT INTO transactions ' +
                        '(robocoin_tx_id, robocoin_tx_type, robocoin_fiat, robocoin_xbt, confirmations, ' +
                        'robocoin_tx_time, robocoin_miners_fee, robocoin_tx_fee) ' +
                    'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    params,
                    function (err) {

                        if (err) return callback('Error saving transaction: ' + err);

                        return callback();
                    }
                );
            } else {

                return callback();
            }
        }
    );
};

TransactionMapper.prototype.saveExchangeTransaction = function (exchangeTx, callback) {

    var txTypes = ['deposit', 'withdrawal', 'market trade'];

    if (exchangeTx.exchange_tx_time !== null) {
        exchangeTx.exchange_tx_time = (new Date(exchangeTx.exchange_tx_time)).toUTCString();
    }

    Connection.getConnection().query(
        'UPDATE transactions ' +
        'SET ' +
            'exchange_tx_id = $1, ' +
            'exchange_fiat = $2, ' +
            'exchange_xbt = $3, ' +
            'exchange_order_id = $4, ' +
            'exchange_tx_fee = $5, ' +
            'exchange_tx_time = $6 ' +
        'WHERE robocoin_tx_id = $7',
        [exchangeTx.exchange_tx_id, exchangeTx.exchange_fiat, exchangeTx.exchange_xbt, exchangeTx.exchange_order_id,
            exchangeTx.exchange_tx_fee, exchangeTx.exchange_tx_time, exchangeTx.robocoin_tx_id],
        function (err) {

            if (err) return callback('Error saving exchange transaction: ' + err);

            return callback();
        }
    );
};

TransactionMapper.prototype.findUnprocessed = function (callback) {

    Connection.getConnection().query(
        'SELECT * ' +
        'FROM transactions ' +
        'WHERE (robocoin_tx_type = \'send\' AND exchange_tx_time IS NULL) ' +
            'OR (robocoin_tx_type = \'forward\' AND confirmations >= 6 AND exchange_order_id IS NULL)' +
        'ORDER BY robocoin_tx_time',
        function (err, res) {
            return callback(err, res.rows);
        }
    );
};

TransactionMapper.prototype.findProcessed = function (callback) {

    Connection.getConnection().query(
        'SELECT * FROM transactions WHERE exchange_tx_time IS NOT NULL ORDER BY exchange_tx_time DESC LIMIT 50',
        function (err, res) {

            if (err) return callback(err);

            return callback(null, res.rows);
        }
    );
};

TransactionMapper.prototype.findLastTransactionTime = function (callback) {

    Connection.getConnection().query(
        'SELECT MAX(robocoin_tx_time) last_time FROM transactions',
        function (err, res) {

            if (err) return callback('Error getting last transaction time: ' + err);

            return callback(err, res.rows[0].last_time);
        }
    );
};

TransactionMapper.prototype.buildProfitReport = function (callback) {

    Connection.getConnection().query(
        'SELECT ' +
            'TO_CHAR(robocoin_tx_time, \'YYYY-MM-DD HH\') date, ' +
            'robocoin_tx_type txType, ' +
            'COALESCE(SUM(robocoin_fiat), 0) robocoinFiat, ' +
            'COALESCE(SUM(exchange_fiat), 0) exchangeFiat, ' +
            'COALESCE(SUM(robocoin_miners_fee * (robocoin_fiat / robocoin_xbt)), 0) robocoinMinersFee, ' +
            'COALESCE(SUM(exchange_miners_fee * (ABS(exchange_fiat) / ABS(exchange_xbt))), 0) exchangeMinersFee, ' +
            'COALESCE(SUM(robocoin_tx_fee * (robocoin_fiat / robocoin_xbt)), 0) robocoinTxFee, ' +
            'COALESCE(SUM(exchange_tx_fee), 0) exchangeTxFee ' +
        'FROM transactions ' +
        'WHERE exchange_tx_time IS NOT NULL ' +
        'AND robocoin_xbt > 0 ' +
        'AND exchange_xbt > 0' +
        'GROUP BY date, robocoin_tx_type',
        function (err, res) {

            if (err) return callback('Error getting profit report: ' + err);

            var outputRow;
            var buys = {};
            var sells = {};
            var row;
            for (var i = 0; i < res.rows.length; i++) {

                row = res.rows[i];

                // if it's a sell...
                if (row.txtype == 'forward') {

                    sells[row.date] = [row.date, row.exchangefiat - row.robocoinfiat, parseFloat(row.robocointxfee),
                        parseFloat(row.exchangetxfee), parseFloat(row.robocoinminersfee)];

                } else if (row.txtype == 'send') { // or if it's a buy...

                    buys[row.date] = [row.date, row.robocoinfiat - row.exchangefiat, parseFloat(row.robocointxfee),
                        parseFloat(row.exchangetxfee), parseFloat(row.exchangeminersfee)];
                }
            }

            buys = Object.keys(buys).map(function (key) { return buys[key] });
            sells = Object.keys(sells).map(function (key) { return sells[key] });

            return callback(null, { buys: buys, sells: sells });
        }
    );
};

TransactionMapper.prototype.buildCashFlowReport = function (callback) {

    Connection.getConnection().query(
        'SELECT ' +
            'SUM(robocoin_fiat) fiat, ' +
            'CASE WHEN robocoin_tx_type = \'send\' THEN \'cash in\' ' +
                'WHEN robocoin_tx_type = \'forward\' THEN \'cash out\' ELSE robocoin_tx_type END tx_type, ' +
            'TO_CHAR(robocoin_tx_time, \'MM\') tx_month, ' +
            'TO_CHAR(robocoin_tx_time, \'D\') tx_day, ' +
            'TO_CHAR(robocoin_tx_time, \'HH\') tx_hour ' +
        'FROM transactions ' +
        'WHERE robocoin_tx_time >= (NOW() - INTERVAL \'1 YEAR\') ' +
        'GROUP BY tx_type, tx_month, tx_day, tx_hour, robocoin_tx_time ' +
        'ORDER BY robocoin_tx_time',
        function (err, res) {

            if (err) return callback('Error getting cash flow report: ' + err);

            var hourly = {};
            var daily = {};
            var monthly = {};
            var row;

            for (var i = 0; i < res.rows.length; i++) {

                row = res.rows[i];

                if (!hourly[row.tx_hour]) {
                    hourly[row.tx_hour] = [row.tx_hour, 0, 0];
                }

                if (!daily[row.tx_day]) {
                    daily[row.tx_day] = [row.tx_day, 0, 0];
                }

                if (!monthly[row.tx_month]) {
                    monthly[row.tx_month] = [row.tx_month, 0, 0];
                }

                if (row.tx_type == 'cash in') {

                    hourly[row.tx_hour][1] += parseFloat(row.fiat);
                    daily[row.tx_day][1] += parseFloat(row.fiat);
                    monthly[row.tx_month][1] += parseFloat(row.fiat);

                } else if (row.tx_type == 'cash out') {

                    hourly[row.tx_hour][2] += parseFloat(row.fiat);
                    daily[row.tx_day][2] += parseFloat(row.fiat);
                    monthly[row.tx_month][2] += parseFloat(row.fiat);
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

    // build query without parameters because pg +
    var idString = '';
    for (var i = 0; i < ids.length; i++) {
        if (idString != '') {
            idString += ',';
        }
        idString += '\'' + ids[i] + '\'';
    }

    Connection.getConnection().query(
        'SELECT * FROM transactions WHERE robocoin_tx_id IN (' + idString + ')',
        function (err, res) {

            if (err) return callback('Error finding all transactions by IDs: ' + err);

            return callback(null, res.rows);
        }
    );

    // TODO handle when some orders aren't found, e.g. input count doesn't match output count
};

module.exports = TransactionMapper;
