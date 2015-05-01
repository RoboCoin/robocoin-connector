'use strict';

var generateSecret = require('../scripts/generateSecret');
var bcrypt = require('bcrypt');
var Connection = require('../data_mappers/PgConnection');

module.exports = {
    add: function (username, callback) {

        var secret = generateSecret();

        bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(secret, salt, function (err, hash) {

                Connection.getConnection().query(
                    'INSERT INTO users (username, password_hash) VALUES (\'' + username + '\',\'' + hash + '\')',
                    function (err) {

                        if (err) return callback('Add user error: ' + err);
                        return callback(null, secret);
                    }
                );
            });
        });
    }
};