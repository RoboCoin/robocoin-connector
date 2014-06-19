'use strict';

var _connection = null;
var mysql = require('mysql');
var config = require('../lib/Config');

var _connect = function () {

    _connection = mysql.createConnection(config.db);

    _connection.connect(function (err) {

        if (err) return console.log('DB connection err: ' + err);
    });

    _connection.on('error', function (err) {

        if (err.code == 'PROTOCOL_CONNECTION_LOST') {

            console.log('DB connection dropped, reconnecting...');
            setTimeout(_connect, 1000);
        }
    });
};

module.exports = {

    getConnection: function () {

        if (_connection === null) {
            _connect();
        }

        return _connection;
    },

    end: function () {
        _connection.end();
    }
};
