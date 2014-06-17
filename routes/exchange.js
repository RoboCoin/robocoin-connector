'use strict';

var request = require('request');
var config = require('../../connectorConfig');
var bitstamp = require('../apis/Exchange').get(config.exchangeClass);
var robocoin = require('../apis/Robocoin').getInstance();
var async = require('async');

exports.lastPrice = function (req, res) {

    bitstamp.getLastPrice(function (err, lastPrice) {

        if (err) return res.json(500, { price: err });

        res.json({ price: lastPrice.price });
    });
};

exports.buy = function (req, res) {

    var amount = req.body.btcAmount;
    var price = req.body.btcPrice;

    async.series({
        buy: function (asyncCallback) {
            bitstamp.buyLimit(amount, price, asyncCallback);
        },
        withdraw: function (asyncCallback) {

            robocoin.getAccountInfo(function (err, roboResponse) {

                if (err) return asyncCallback(err);

                bitstamp.withdraw(amount, roboResponse.depositAddress, asyncCallback);
            });
        }
    }, function (err, asyncResponse) {

        if (err) return res.send(err);

        return res.send('Bought ' + asyncResponse.buy.btc + ' for $' + Math.abs(asyncResponse.buy.usd) +
            ' at $' + asyncResponse.buy.btc_usd + ' with a fee of $' + asyncResponse.buy.fee);
    });
};

exports.sell = function (req, res) {

    var amount = req.body.btcAmount;
    var price = req.body.btcPrice;

    bitstamp.sellLimit(amount, price, function (err, sellOrder) {

        if (err) return res.send(err);

        return res.send('Sold ' + Math.abs(sellOrder.btc) + ' for $' + Math.abs(sellOrder.usd) +
            ' at $' + sellOrder.btc_usd + ' with a fee of $' + sellOrder.fee);
    });
};

exports.latestTransactions = function (req, res) {

    bitstamp.userTransactions(function (err, userTransactions) {

        if (err) return res.send(err);

        return res.send(userTransactions);
    });
};