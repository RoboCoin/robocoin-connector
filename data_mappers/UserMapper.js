'use strict';

var Connection = require('./PgConnection');
var bcrypt = require('bcrypt');
var winston = require('winston');
var async = require('async');
var FailedLoginMapper = require('./FailedLoginMapper');

var UserMapper = function () {
};

UserMapper.prototype.findByLogin = function (username, password, callback) {

    var failedLoginMapper = new FailedLoginMapper();

    async.series([
        function (asyncCallback) {

            failedLoginMapper.isUserLockedOut(username, function (err, isLocked) {

                if (err) return asyncCallback(err);

                if (isLocked) return asyncCallback('This account is temporarily locked out.');

                return asyncCallback();
            });
        },
        function (asyncCallback) {

            Connection.getConnection().query(
                'SELECT id, username, password_hash FROM users WHERE username = $1',
                [username],
                function (err, queryResult) {

                    if (err) return asyncCallback('Error looking up user by username: ' + err);

                    if (queryResult.rowCount == 0) {
                        winston.warn('username not found: ' + username);
                        return asyncCallback('Invalid login');
                    }

                    bcrypt.compare(password, queryResult.rows[0].password_hash, function (err, compareResult) {

                        if (!compareResult) {

                            winston.warn('Wrong password');
                            failedLoginMapper.incrementForUsername(username, function (err) {

                                if (err) winston.error('Error incrementing failed logins: ' + err);

                                return asyncCallback('Invalid login');
                            });
                        } else {

                            return asyncCallback(null, queryResult.rows[0]);
                        }
                    });
                }
            );
        }
    ], function (err, res) {
        
        return callback(err, res[1]);
    });
};

UserMapper.prototype.findById = function (id, callback) {

    Connection.getConnection().query(
        'SELECT * FROM users WHERE id = $1',
        [id],
        function (err, res) {

            if (err) return callback('Error looking up user by ID: ' + err);

            if (res.rowCount == 0) return callback('user ID not found: ' + id);

            return callback(null, res.rows[0]);
        }
    );
};

module.exports = UserMapper;
