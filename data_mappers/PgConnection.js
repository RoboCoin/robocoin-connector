'use strict';

var pg = require('pg');
var config = require('../lib/Config');
var winston = require('winston');
var connectionString = 'postgres://' + config.db.user + ':' + config.db.password + '@' + config.db.host + '/'
    + config.db.database;

var connection = {
    query: function (sql, params, callback) {

        // make params optional
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        pg.connect(connectionString, function (err, client, done) {

            if (err) return callback('Error connecting to DB:' + err);

            client.query(sql, params, function (err, result) {

                done();

                if (err) return callback('Error running query: ' + sql + err);

                callback(null, result);
            });
        });
    }
};

module.exports = {
    getConnection: function () {
        return connection;
    },
    end: function () {}
};
