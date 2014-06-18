'use strict';

var request = require('request');
var config = require('../../connectorConfig');
var exchange = require('../apis/Exchange').get(config.exchangeClass);
var robocoin = require('../apis/Robocoin').getInstance();
var async = require('async');

exports.lastPrice = function (req, res) {

    exchange.getLastPrice(function (err, lastPrice) {

        if (err) return res.json(500, { price: err });

        res.json({ price: lastPrice.price });
    });
};

exports.buy = function (req, res) {

    var amount = req.body.btcAmount;
    var price = req.body.btcPrice;

    async.series({
        buy: function (asyncCallback) {
            exchange.buyLimit(amount, price, asyncCallback);
        },
        withdraw: function (asyncCallback) {

            robocoin.getAccountInfo(function (err, roboResponse) {

                if (err) return asyncCallback(err);

                exchange.withdraw(amount, roboResponse.depositAddress, asyncCallback);
            });
        }
    }, function (err, asyncResponse) {

        if (err) return res.send(err);

        return res.send('Bought ' + asyncResponse.buy.btc + ' for $' + Math.abs(asyncResponse.buy.fiat) +
            ' with a fee of $' + asyncResponse.buy.fee);
    });
};

exports.sell = function (req, res) {

    var amount = req.body.btcAmount;
    var price = req.body.btcPrice;

    exchange.sellLimit(amount, price, function (err, sellOrder) {

        if (err) return res.send(err);

        return res.send('Sold ' + Math.abs(sellOrder.btc) + ' for $' + Math.abs(sellOrder.fiat) +
            ' with a fee of $' + sellOrder.fee);
    });
};

exports.latestTransactions = function (req, res) {

    exchange.userTransactions(function (err, userTransactions) {

        if (err) return res.send(err);

        return res.send(userTransactions);
    });
};