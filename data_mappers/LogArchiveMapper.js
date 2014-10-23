'use strict';

var Connection = require('./PgConnection');

var LogArchiveMapper = function () {

};

LogArchiveMapper.prototype.save = function (logsAsString, callback) {

    Connection.getConnection().query('INSERT INTO log_archive (log_entries) VALUES ($1)',
        [logsAsString],
        function (err) {

            if (err) return callback('Error saving log archive: ' + err);

            return callback();
        });
};

module.exports = LogArchiveMapper;
