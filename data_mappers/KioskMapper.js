'use strict';

var Connection = require('./PgConnection');
var winston = require('winston');

var KioskMapper = function () {

};

KioskMapper.prototype.add = function (kiosk, callback) {

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

KioskMapper.prototype.update = function (kiosk, existingId, callback) {

    Connection.getConnection().query(
        'UPDATE kiosks SET name = $1, id = $2 WHERE id = $3',
        [kiosk.name, kiosk.id, existingId],
        function (err) {

            if (err) {
                winston.error('Error updating kiosk: ' + err);
                return callback('Error updating kiosk');
            }

            return callback();
        }
    );
};

module.exports = KioskMapper;
