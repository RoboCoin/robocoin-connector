'use strict';

var Connection = require('./PgConnection');

var LogMapper = function () {

};

LogMapper.prototype.findAll = function (callback) {

    Connection.getConnection().query('SELECT * FROM logs ORDER BY ts DESC LIMIT 100', function (err, res) {

        if (err) return callback('Error getting logs: ' + err);

        return callback(null, res.rows);
    });
};

module.exports = LogMapper;
