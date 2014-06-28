'use strict';

var Connection = require('./PgConnection');

var FailedLoginMapper = function () {
};

FailedLoginMapper.prototype.incrementForUsername = function (username, callback) {

    Connection.getConnection().query(
        'INSERT INTO failed_logins (user_id, time_attempted) ' +
            'VALUES ((SELECT id FROM users WHERE username = $1), NOW())',
        [username],
        function (err) {

            if (err) return callback('Error incrementing failed logins: ' + err);

            return callback();
        }
    );
};

FailedLoginMapper.prototype.isUserLockedOut = function (username, callback) {

    Connection.getConnection().query(
        'SELECT COUNT(*) failed_logins ' +
            'FROM failed_logins ' +
            'WHERE user_id = (' +
                'SELECT id FROM users WHERE username = $1) ' +
            'AND time_attempted > (NOW() - INTERVAL \'20 minutes\')',
        [username],
        function (err, res) {

            if (err) return callback('Error getting lockout status: ' + err);

            return callback(null, res.rows[0].failed_logins >= 3);
        }
    );
};

module.exports = FailedLoginMapper;
