'use strict';

var Connection = require('./PgConnection');
var winston = require('winston');
var EventEmitter = require('events').EventEmitter;
var Session = require('express-session').Session;
var Cookie = require('express-session').Cookie;

var SessionMapper = module.exports = function SessionMapper (options) {};

SessionMapper.prototype.__proto__ = require('express-session').Store.prototype;

SessionMapper.prototype.get = function (sid, callback) {

    Connection.getConnection().query(
        'SELECT session_data FROM sessions WHERE sid = $1',
        [sid],
        function (err, res) {

            if (err) return callback('Error getting session: ' + err);

            if (res.rowCount == 0) return callback();

            callback(null, JSON.parse(res.rows[0].session_data));
        }
    );
};

SessionMapper.prototype.set = function (sid, session, callback) {

    var connection = Connection.getConnection();

    connection.query(
        'SELECT 1 FROM sessions WHERE sid = $1',
        [sid],
        function (err, res) {

            if (err) return callback('Error checking for session: ' + err);

            if (res.rowCount == 0) {

                connection.query(
                    'INSERT INTO sessions (sid, session_data) VALUES ($1, $2)',
                    [sid, session],
                    function (err, res) {

                        if (err) return callback('Error adding session: ' + err);

                        return callback();
                    }
                );
            } else {

                connection.query(
                    'UPDATE sessions SET session_data = $1 WHERE sid = $2',
                    [session, sid],
                    function (err, res) {

                        if (err) return callback('Error updating session: ' + err);

                        return callback();
                    }
                );
            }
        }
    );
};

SessionMapper.prototype.destroy = function (sid, callback) {

    Connection.getConnection().query(
        'DELETE FROM sessions WHERE sid = $1',
        [sid],
        function (err) {

            // log it but don't throw the error
            if (err) winston.error('Error deleting session: ' + err);

            return callback();
        }
    );
};

module.exports = SessionMapper;
