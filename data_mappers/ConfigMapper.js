'use strict';

var Connection = require('./PgConnection');
var async = require('async');
var Config = require('../lib/Config');

var ConfigMapper = function () {
};

ConfigMapper.prototype.findAll = function (callback) {

    Connection.getConnection().query(
        'SELECT * FROM config',
        function (err, res) {

            if (err) return callback('Error getting config: ' + err);

            var config = {};
            for (var i = 0; i < res.rows.length; i++) {
                config[res.rows[i].param_name] = res.rows[i].param_value;
            }

            return callback(null, new Config(config));
        }
    );
};

ConfigMapper.prototype.save = function (config, callback) {

    var dirtyParams = config.getDirty();
    var dirtyKeys = Object.keys(dirtyParams);
    var connection = Connection.getConnection();

    async.eachSeries(dirtyKeys, function (dirtyKey, asyncCallback) {

        connection.query(
            'UPDATE config SET param_value = $1 WHERE param_name = $2',
            [dirtyParams[dirtyKey], dirtyKey],
            function (err, res) {

                if (err) return asyncCallback(err);

                if (res.rowCount === 0) {

                    connection.query(
                        'INSERT INTO config (param_name, param_value) VALUES ($1, $2)',
                        [dirtyKey, dirtyParams[dirtyKey]],
                        asyncCallback
                    );

                } else {

                    return asyncCallback();
                }
            }
        );

    }, callback);
};

module.exports = ConfigMapper;
