'use strict';

var Connection = require('./PgConnection');
var async = require('async');
var Config = require('../lib/Config');
var configInstance = null;
var crypto = require('crypto');
var encryptionKey = process.env.ENCRYPTION_KEY;

var ConfigMapper = function () {
};

ConfigMapper.prototype.findAll = function (callback) {

    Connection.getConnection().query(
        'SELECT * FROM config',
        function (err, res) {

            if (err) return callback('Error getting config: ' + err);

            var params = {};
            var decryptedValue;
            var aesDecipher;
            for (var i = 0; i < res.rows.length; i++) {

                aesDecipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
                decryptedValue = aesDecipher.update(res.rows[i].param_value, 'base64', 'utf8');
                decryptedValue += aesDecipher.final('utf8');

                params[res.rows[i].param_name] = decryptedValue;
            }

            var returnConfig;
            if (configInstance === null) {
                configInstance = Config.getInstance();
                configInstance.updateParams(params);
            } else {
                configInstance.updateParams(params);
            }

            return callback(null, configInstance);
        }
    );
};

ConfigMapper.prototype.save = function (config, callback) {

    var dirtyParams = config.getDirty();
    var dirtyKeys = Object.keys(dirtyParams);
    var connection = Connection.getConnection();
    var encryptedValue;
    var aes;
    configInstance = config;

    async.eachSeries(dirtyKeys, function (dirtyKey, asyncCallback) {

        aes = crypto.createCipher('aes-256-cbc', encryptionKey);
        encryptedValue = aes.update(dirtyParams[dirtyKey], 'utf8', 'base64');
        encryptedValue += aes.final('base64');

        connection.query(
            'UPDATE config SET param_value = $1 WHERE param_name = $2',
            [encryptedValue, dirtyKey],
            function (err, res) {

                if (err) return asyncCallback(err);

                if (res.rowCount === 0) {

                    connection.query(
                        'INSERT INTO config (param_name, param_value) VALUES ($1, $2)',
                        [dirtyKey, encryptedValue],
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
