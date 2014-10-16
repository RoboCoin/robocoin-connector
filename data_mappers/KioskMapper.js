'use strict';

var Connection = require('./PgConnection');
var winston = require('winston');

var KioskMapper = function () {

};

KioskMapper.prototype.save = function (kiosk, callback) {

    Connection.getConnection().query(
        'UPDATE kiosks SET name = $1 WHERE id = $2',
        [kiosk.name, kiosk.id],
        function (err, res) {

            if (err) {
                winston.error('Error updating kiosk: ' + err);
                return callback('Error updating kiosk');
            }

            if (res.rowCount === 0) {

                Connection.getConnection().query(
                    'INSERT INTO kiosks (id, name) VALUES ($1, $2)',
                    [kiosk.id, kiosk.name],
                    function (err) {

                        if (err) {
                            winston.error('Error adding kiosk: ' + err);
                            return callback('Error adding kiosk');
                        }

                        return callback();
                    }
                );
            } else {

                return callback();
            }
        }
    );
};

KioskMapper.prototype.findAll = function (callback) {

    Connection.getConnection().query(
        'SELECT * FROM kiosks',
        function (err, res) {

            if (err) {
                winston.error('Error getting all kiosks: ' + err);
                return callback('Error getting all kiosks');
            }

            return callback(null, res.rows);
        }
    );
};

KioskMapper.prototype.findOne = function (callback) {

    Connection.getConnection().query(
        'SELECT id FROM kiosks LIMIT 1',
        function (err, res) {

            if (err) {
                winston.error('Error getting a kiosk: ' + err);
                return callback('Error getting a kiosk');
            }

            return callback(null, res.rows[0]);
        }
    );
};

module.exports = KioskMapper;
