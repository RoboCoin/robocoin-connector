'use strict';

var ConfigMapper = require('./ConfigMapper');
var configMapper = new ConfigMapper();
var Connection = require('./PgConnection');
var bigdecimal = require('bigdecimal');
var RobocoinTxTypes = require('../lib/RobocoinTxTypes');

var TransactionMapper = function () {
};

TransactionMapper.prototype.save = function (robocoinTx, callback) {

    robocoinTx.time = (new Date(robocoinTx.time)).toUTCString();

    var params = [robocoinTx.transactionId, robocoinTx.type, robocoinTx.fiat, robocoinTx.currencyType,
        robocoinTx.xbt, robocoinTx.time, robocoinTx.fee, robocoinTx.machineId, robocoinTx.transactionHash];

    Connection.getConnection().query(
            'INSERT INTO transactions ' +
            '(robocoin_tx_id, robocoin_tx_type, robocoin_fiat, robocoin_currency, ' +
            'robocoin_xbt, robocoin_tx_time, robocoin_tx_fee, kiosk_id, tx_hash) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        params,
        function (err) {

            if (err) return callback('Error saving transaction: ' + err);

            return callback();
        }
    );
};

TransactionMapper.prototype.saveExchangeTransaction = function (exchangeTx, callback) {

    if (exchangeTx.exchange_tx_time !== null) {
        exchangeTx.exchange_tx_time = (new Date(exchangeTx.exchange_tx_time)).toUTCString();
    }

    configMapper.findAll(function (err, config) {

        if (err) return callback(err);

        var exchangeCurrency = config.get(exchangeTx.kiosk_id, 'exchangeCurrency');
        var kioskCurrency = config.get(exchangeTx.kiosk_id, 'kioskCurrency');
        var exchangeToKioskConversionRate =
            new bigdecimal.BigDecimal(config.get(exchangeTx.kiosk_id, 'exchangeToKioskConversionRate') || 1);
        var exchangeFiat = new bigdecimal.BigDecimal(exchangeTx.exchange_fiat);

        var convertedExchangeFiat;
        if (kioskCurrency !== null && exchangeCurrency != kioskCurrency) {

            convertedExchangeFiat = exchangeFiat
                .divide(exchangeToKioskConversionRate, bigdecimal.MathContext.DECIMAL128())
                .setScale(8, bigdecimal.RoundingMode.DOWN())
                .toPlainString();

        } else {

            convertedExchangeFiat = exchangeFiat.toPlainString();
        }

        Connection.getConnection().query(
                'UPDATE transactions ' +
                'SET ' +
                'exchange_tx_id = $1, ' +
                'exchange_fiat = $2, ' +
                'exchange_xbt = $3, ' +
                'exchange_tx_fee = $4, ' +
                'exchange_tx_time = $5, ' +
                'exchange_currency = $6,  ' +
                'exchange_to_kiosk_conversion_rate = $7, ' +
                'converted_exchange_fiat = $8, ' +
                'exchange_class = $9' +
                'WHERE robocoin_tx_id = $10',
            [exchangeTx.exchange_tx_id, exchangeTx.exchange_fiat, exchangeTx.exchange_xbt, exchangeTx.exchange_tx_fee,
                exchangeTx.exchange_tx_time, exchangeCurrency, exchangeToKioskConversionRate.toPlainString(),
                convertedExchangeFiat, exchangeTx.exchangeClass, exchangeTx.robocoin_tx_id],
            function (err) {

                if (err) return callback('Error saving exchange transaction: ' + err);

                return callback();
            }
        );
    });
};

TransactionMapper.prototype.findUnprocessed = function (callback) {

    Connection.getConnection().query(
        'SELECT * ' +
        'FROM transactions ' +
        'WHERE (robocoin_tx_type = $1 AND exchange_tx_time IS NULL) ' +
            'OR (robocoin_tx_type = $2 AND exchange_tx_id IS NULL) ' +
        'ORDER BY robocoin_tx_time',
        [RobocoinTxTypes.SEND, RobocoinTxTypes.RECV],
        function (err, res) {
            if (!res) {
                return callback(null, []);
            }
            return callback(err, res.rows);
        }
    );
};

TransactionMapper.prototype.findUnprocessedForKiosk = function(kioskId, callback) {

    Connection.getConnection().query(
        'SELECT * ' +
        'FROM transactions ' +
        'WHERE kiosk_id = $1' +
            'AND (robocoin_tx_type = $2 AND exchange_tx_time IS NULL) ' +
            'OR (robocoin_tx_type = $3 AND exchange_tx_id IS NULL) ' +
        'ORDER BY robocoin_tx_time',
        [kioskId, RobocoinTxTypes.SEND, RobocoinTxTypes.RECV],
        function (err, res) {

            if (err) return callback(err);

            return callback(null, res.rows);
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

TransactionMapper.prototype.findProcessedForKiosk = function (kioskId, callback) {

    Connection.getConnection().query(
        'SELECT * ' +
        'FROM transactions ' +
        'WHERE kiosk_id = $1 ' +
            'AND exchange_tx_time IS NOT NULL ' +
        'ORDER BY exchange_tx_time DESC LIMIT 50',
        [kioskId],
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

TransactionMapper.prototype.buildProfitReport = function (kioskId, callback) {

    Connection.getConnection().query(
        'SELECT ' +
            'TO_CHAR(robocoin_tx_time, \'YYYY-MM\') date, ' +
            'robocoin_tx_type txType, ' +
            'COALESCE(ROUND(SUM(robocoin_fiat), 3), 0) robocoinFiat, ' +
            'COALESCE(ROUND(SUM(converted_exchange_fiat), 3), 0) exchangeFiat, ' +
            'COALESCE(ROUND(SUM(exchange_miners_fee * (ABS(converted_exchange_fiat) / ABS(exchange_xbt))), 3), 0) exchangeMinersFee, ' +
            'COALESCE(ROUND(SUM(robocoin_tx_fee * (robocoin_fiat / robocoin_xbt)), 3), 0) robocoinTxFee, ' +
            'COALESCE(ROUND(SUM(exchange_tx_fee), 3), 0) exchangeTxFee, ' +
            'AVG(exchange_to_kiosk_conversion_rate) exchangeToKioskConversionRate ' +
        'FROM transactions ' +
        'WHERE exchange_tx_time IS NOT NULL ' +
            'AND robocoin_xbt > 0 ' +
            'AND exchange_xbt > 0 ' +
            'AND kiosk_id = $1 ' +
        'GROUP BY date, robocoin_tx_type ' +
        'ORDER BY date DESC',
        [kioskId],
        function (err, res) {

            if (err) return callback('Error getting profit report: ' + err);

            var outputRow;
            var buys = {};
            var sells = {};
            var row;
            for (var i = 0; i < res.rows.length; i++) {

                row = res.rows[i];

                // if it's a sell...
                if (row.txtype == RobocoinTxTypes.RECV) {

                    sells[row.date] = [row.date, row.exchangefiat - row.robocoinfiat, parseFloat(row.robocointxfee),
                        parseFloat(row.exchangetxfee)];

                } else if (row.txtype == RobocoinTxTypes.SEND) { // or if it's a buy...

                    buys[row.date] = [row.date, row.robocoinfiat - row.exchangefiat, parseFloat(row.robocointxfee),
                        parseFloat(row.exchangetxfee)];
                }
            }

            buys = Object.keys(buys).map(function (key) { return buys[key] });
            sells = Object.keys(sells).map(function (key) { return sells[key] });

            return callback(null, { buys: buys, sells: sells });
        }
    );
};

TransactionMapper.prototype.buildCashFlowReport = function (kioskId, callback) {

    Connection.getConnection().query(
        'SELECT ' +
            'SUM(robocoin_fiat) fiat, ' +
            'CASE WHEN robocoin_tx_type = \'OPERATOR_SEND\' THEN \'cash in\' ' +
                'WHEN robocoin_tx_type = \'OPERATOR_RECV\' THEN \'cash out\' ELSE robocoin_tx_type END tx_type, ' +
            'TO_CHAR(robocoin_tx_time, \'MM\') tx_month, ' +
            'TO_CHAR(robocoin_tx_time, \'D\') tx_day, ' +
            'TO_CHAR(robocoin_tx_time, \'HH\') tx_hour ' +
        'FROM transactions ' +
        'WHERE robocoin_tx_time >= (NOW() - INTERVAL \'1 YEAR\') ' +
            'AND kiosk_id = $1 ' +
        'GROUP BY tx_type, tx_month, tx_day, tx_hour, robocoin_tx_time ' +
        'ORDER BY robocoin_tx_time DESC',
        [kioskId],
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
