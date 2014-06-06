'use strict';

var request = require('request');
var config = require('../../connectorConfig');

exports.lastPrice = function (req, res) {

    request('https://www.bitstamp.net/api/ticker/', { json: true }, function (err, response, body) {

        if (err) return res.json(500, { price: err });

        res.json({ price: body.last });
    });
};
