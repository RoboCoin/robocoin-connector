'use strict';

var Connection = require('./PgConnection');
var bcrypt = require('bcrypt');
var winston = require('winston');

var UserMapper = function () {
};

UserMapper.prototype.findByLogin = function (username, password, callback) {

    Connection.getConnection().query(
        'SELECT id, username, password_hash FROM users WHERE username = $1',
        [username],
        function (err, queryResult) {

            if (err) return callback('Error looking up user by username: ' + err);

            if (queryResult.rowCount == 0) {
                winston.log('username not found: ' + username);
                return callback({});
            }

            bcrypt.compare(password, queryResult.rows[0].password_hash, function (err, compareResult) {

                if (!compareResult) {
                    winston.log('Wrong password');
                    return callback({});
                }

                return callback(null, queryResult.rows[0]);
            });
        }
    );
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
