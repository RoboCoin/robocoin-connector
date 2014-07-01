'use strict';

var request = require('request');
var Exchange = require('../apis/Exchange');
var Robocoin = require('../apis/Robocoin');
var async = require('async');
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var UserMapper = require('../data_mappers/UserMapper');
var userMapper = new UserMapper();

exports.lastPrice = function (req, res) {

    configMapper.findAll(function (configErr, config) {

        if (configErr) return res.json(500, { price: configErr });

        var exchange = Exchange.get(config);
        exchange.getLastPrice(function (err, lastPrice) {

            if (err) return res.json(500, { price: err });

            res.json({ price: lastPrice.price });
        });
    });
};

exports.buy = function (req, res) {

    var amount = req.body.btcAmount;
    var price = req.body.btcPrice;
    var username = req.body.username;
    var password = req.body.password;

    configMapper.findAll(function (configErr, config) {

        if (configErr) return res.send(configErr);

        var exchange = Exchange.get(config);
        async.series({
            reauth: function (asyncCallback) {
                userMapper.findByLogin(username, password, asyncCallback);
            },
            buy: function (asyncCallback) {
                exchange.buy(amount, price, asyncCallback);
            },
            withdraw: function (asyncCallback) {

                var robocoin = Robocoin.getInstance(config);
                robocoin.getAccountInfo(function (err, roboResponse) {

                    if (err) return asyncCallback(err);

                    exchange.withdraw(amount, roboResponse.deposit_address, asyncCallback);
                });
            }
        }, function (err, asyncResponse) {

            if (err) return res.send(err, 400);

            return res.send('Bought ' + asyncResponse.buy.btc + ' for $' + Math.abs(asyncResponse.buy.fiat) +
                ' with a fee of $' + asyncResponse.buy.fee);
        });
    });
};

exports.sell = function (req, res) {

    var amount = req.body.btcAmount;
    var price = req.body.btcPrice;
    var username = req.body.username;
    var password = req.body.password;

    configMapper.findAll(function (configErr, config) {

        if (configErr) return res.send(configErr);

        var exchange = Exchange.get(config);
        async.series({
            reauth: function (asyncCallback) {
                userMapper.findByLogin(username, password, asyncCallback);
            },
            sell: function (asyncCallback) {
                exchange.sell(amount, price, asyncCallback);
            }
        }, function (err, asyncResponse) {

            if (err) return res.send(err, 400);

            return res.send('Sold ' + Math.abs(asyncResponse.sell.btc) + ' for $' + Math.abs(asyncResponse.sell.fiat) +
                ' with a fee of $' + asyncResponse.sell.fee);
        });
    });
};

exports.latestTransactions = function (req, res) {

    configMapper.findAll(function (configErr, config) {

        if (configErr) return res.send(configErr);

        var exchange = Exchange.get(config);
        exchange.userTransactions(function (err, userTransactions) {

            if (err) return res.send(err);

            return res.send(userTransactions);
        });
    });
};