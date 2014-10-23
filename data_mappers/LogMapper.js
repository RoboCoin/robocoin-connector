'use strict';

var Connection = require('./PgConnection');

var LogMapper = function () {

};

LogMapper.prototype.findAll = function (callback) {

    Connection.getConnection().query(
        'SELECT ROUND(EXTRACT(epoch from ts)) AS ts, level, message FROM logs ORDER BY ts DESC',
        function (err, res) {

            if (err) return callback('Error getting logs: ' + err);

            return callback(null, res.rows);
        }
    );
};

LogMapper.prototype.findForArchive = function (callback) {

    Connection.getConnection().query('SELECT * FROM logs ORDER BY ts OFFSET 100', function (err, result) {

        if (err) return callback('Error getting logs for archive: ' + err);

        return callback(null, result.rows);
    });
};

LogMapper.prototype.deleteOnFrom = function (mostRecentTs, callback) {

    Connection.getConnection().query('DELETE FROM logs WHERE ts >= $1', [mostRecentTs], function (err) {

        if (err) return callback('Error deleting logs: ' + err);

        return callback();
    });
};

module.exports = LogMapper;
