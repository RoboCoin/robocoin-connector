'use strict';

var pg = require('pg');
var connectionString = process.env.DATABASE_URL;
var winston = require('winston');

var connection = {
    query: function (sql, params, callback) {

        var query;

        // make params optional
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        pg.connect(connectionString, function (err, client, done) {

            if (err) return callback('Error connecting to DB:' + err);

            query = client.query(sql, params, function (err, result) {

                done();

                if (err) return callback('Error running query: ' + sql + err);

                callback(null, result);
            });
            console.log('SQL: ', query.text, query.values);
        });
    }
};

module.exports = {
    getConnection: function () {
        return connection;
    },
    end: function () {}
};
