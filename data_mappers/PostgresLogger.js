'use strict';

var winston = require('winston');
var util = require('util');
var Connection = require('./PgConnection');

var PostgresLogger = winston.transports.CustomLogger = function (options) {

    if (typeof options === 'undefined') {
        options = {};
    }

    this.name = 'postgresLogger';
    this.level = options.level || 'info';
};

util.inherits(PostgresLogger, winston.Transport);

PostgresLogger.prototype.log = function (level, msg, meta, callback) {

    Connection.getConnection().query(
        'INSERT INTO logs (level, message, meta) VALUES ($1, $2, $3)',
        [level, msg, meta],
        function (err, res) {

            if (err) return callback('Error logging: ' + err);

            return callback(null, true);
        }
    );
};

module.exports = PostgresLogger;
