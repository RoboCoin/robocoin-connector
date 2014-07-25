'use strict';

var request = require('request');
var Exchange = require('../apis/Exchange');
var Robocoin = require('../apis/Robocoin');
var async = require('async');
var UserMapper = require('../data_mappers/UserMapper');
var userMapper = new UserMapper();
var winston = require('winston');
var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();

exports.lastPrices = function (req, res) {

    var exchange = Exchange.get(req.config.getAllForKiosk(req.query.kioskId));
    exchange.getPrices(function (err, prices) {

        if (err) return res.json(500, { price: err });

        res.json({ buyPrice: prices.buyPrice, sellPrice: prices.sellPrice});
    });
};

exports.buy = function (req, res) {

    var amount = req.body.btcAmount;
    var price = req.body.btcPrice;
    var username = req.body.username;
    var password = req.body.password;
    var kioskId = req.body.kioskId;

    var exchange = Exchange.get(req.config.getAllForKiosk(kioskId));
    async.series({
        reauth: function (asyncCallback) {
            userMapper.findByLogin(username, password, asyncCallback);
        },
        buy: function (asyncCallback) {

            exchange.buy(amount, price, asyncCallback);
        },
        withdraw: function (asyncCallback) {

            var robocoin = Robocoin.getInstance(req.config);
            robocoin.getAccountInfo(function (err, roboResponse) {

                if (err) return asyncCallback(err);

                exchange.withdraw(amount, roboResponse.deposit_address, asyncCallback);
            });
        }
    }, function (err, asyncResponse) {

        if (err) return res.send(err, 400);

        return res.send('Bought ' + asyncResponse.buy.xbt + ' for $' + Math.abs(asyncResponse.buy.fiat) +
            ' with a fee of $' + asyncResponse.buy.fee);
    });
};

exports.sell = function (req, res) {

    var amount = req.body.btcAmount;
    var price = req.body.btcPrice;
    var username = req.body.username;
    var password = req.body.password;
    var kioskId = req.body.kioskId;

    var exchange = Exchange.get(req.config.getAllForKiosk(kioskId));
    async.series({
        reauth: function (asyncCallback) {
            userMapper.findByLogin(username, password, asyncCallback);
        },
        sell: function (asyncCallback) {
            exchange.sell(amount, price, asyncCallback);
        }
    }, function (err, asyncResponse) {

        if (err) return res.send(err, 400);

        return res.send('Sold ' + Math.abs(asyncResponse.sell.xbt) + ' for $' + Math.abs(asyncResponse.sell.fiat) +
            ' with a fee of $' + asyncResponse.sell.fee);
    });
};

exports.latestTransactions = function (req, res) {

    var exchange = Exchange.get(req.config.getAllForKiosk(req.query.kioskId));
    exchange.userTransactions(function (err, userTransactions) {

        if (err) return res.send(err);

        return res.send(userTransactions);
    });
};

exports.accountInfo = function (req, res) {

    var exchange = Exchange.get(req.config.getAllForKiosk(req.query.kioskId));
    exchange.getBalance(function (err, balance) {

        if (err) return res.send(400, err);

        exchange.getDepositAddress(function (err, depositAddress) {

            if (err) return res.send(400, err);

            configMapper.findAll(function (err, config) {

                if (err) return res.send(500, err);

                var params = config.getAllForKiosk(req.query.kioskId);

                return res.send({
                    address: depositAddress.address,
                    balance: balance,
                    currency: params.exchangeCurrency,
                    exchangeClass: params.exchangeClass
                });
            });
        });
    });
};