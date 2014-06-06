'use strict';

var request = require('request');
var config = require('../../connectorConfig');
var exports = {};
var bitstamp;
var robocoin;
var async = require('async');

exports.lastPrice = function (req, res) {

    request('https://www.bitstamp.net/api/ticker/', { json: true }, function (err, response, body) {

        if (err) return res.json(500, { price: err });

        res.json({ price: body.last });
    });
};

exports.buy = function (req, res) {

    var amount = req.body.btcAmount;
    var price = req.body.btcPrice;

    async.series([
        function (asyncCallback) {

            bitstamp.buyLimit(amount, price, asyncCallback);
        },
        function (asyncCallback) {

            robocoin.getAccountInfo(function (err, roboResponse) {

                if (err) return asyncCallback(err);

                bitstamp.withdraw(amount, roboResponse.depositAddress, asyncCallback);
            });
        }
    ], function (err, asyncResponse) {

        if (err) return res.send(err);

        return res.send('Bought ' + amount + ' for ' + price);
    });
};

module.exports = function (globalRobocoin, globalBitstamp) {

    bitstamp = globalBitstamp;
    robocoin = globalRobocoin;
    return exports;
};