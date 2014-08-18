'use strict';

var Connection = require('./PgConnection');
var async = require('async');
var Config = require('../lib/Config');
var configInstance = null;
var crypto = require('crypto');
var encryptionKey = process.env.ENCRYPTION_KEY;

if (!encryptionKey) {
    console.error("You must set the ENCRYPTION_KEY environment variable!");
    process.exit(1);
}

var ConfigMapper = function () {
};

ConfigMapper.prototype.findAll = function (callback) {

    Connection.getConnection().query(
        'SELECT * FROM config',
        function (err, res) {

            if (err) return callback('Error getting config: ' + err);

            var decryptedValue;
            var aesDecipher;
            for (var i = 0; i < res.rows.length; i++) {

                aesDecipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
                decryptedValue = aesDecipher.update(res.rows[i].param_value, 'base64', 'utf8');
                decryptedValue += aesDecipher.final('utf8');

                res.rows[i].param_value = decryptedValue;
            }

            var returnConfig;
            if (configInstance === null) {
                configInstance = Config.getInstance();
                configInstance.updateParams(res.rows);
            } else {
                configInstance.updateParams(res.rows);
            }

            return callback(null, configInstance);
        }
    );
};

ConfigMapper.prototype.save = function (kioskId, config, callback) {

    var dirtyParams = config.getDirtyForKiosk(kioskId);
    var dirtyKeys = Object.keys(dirtyParams);
    var connection = Connection.getConnection();
    var encryptedValue;
    var aes;
    configInstance = config;

    async.eachSeries(dirtyKeys, function (dirtyKey, asyncCallback) {

        aes = crypto.createCipher('aes-256-cbc', encryptionKey);
        encryptedValue = aes.update(dirtyParams[dirtyKey], 'utf8', 'base64');
        encryptedValue += aes.final('base64');

        // eww.
        var sql;
        var queryParams;
        if (kioskId === null) {

            sql = 'UPDATE config SET param_value = $1 WHERE kiosk_id IS NULL AND param_name = $2';
            queryParams = [encryptedValue, dirtyKey];

        } else {

            sql = 'UPDATE config SET param_value = $1 WHERE kiosk_id = $2 AND param_name = $3';
            queryParams = [encryptedValue, kioskId, dirtyKey];
        }

        connection.query(sql, queryParams, function (err, res) {

                if (err) return asyncCallback(err);

                if (res.rowCount === 0) {

                    connection.query(
                        'INSERT INTO config (kiosk_id, param_name, param_value) VALUES ($1, $2, $3)',
                        [kioskId, dirtyKey, encryptedValue],
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
