'use strict';

var request = require('request');
var winston = require('winston');

var _ping = function () {

    request(process.env.PING_URL, function (error, response, body) {

        if (error) return winston.error('Error pinging: ' + error);

        return console.log('Successfully pinged: ' + process.env.PING_URL);
    });
};

setInterval(function () { _ping(); }, 3600000);
