'use strict';

var winston = require('winston');
var SessionMapper = require('./data_mappers/SessionMapper');
var sessionMapper = new SessionMapper();

setInterval(function () {
    var now = new Date();
    var expirationDate = new Date(now - (1000 * 60 * 60));
    sessionMapper.deleteAllOlderThan(expirationDate, function (err) {
        if (err) return winston.error(err);
        return console.log('Deleted old sessions');
    });
}, (1000 * 60 * 10)); // every ten minutes
