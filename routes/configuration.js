'use strict';

var ConfigMapper = require('../data_mappers/ConfigMapper');
var winston = require('winston');
var Config = require('../lib/Config');
var UserMapper = require('../data_mappers/UserMapper');
var async = require('async');
var fs = require('fs');

var _getExchangeConfigs = function () {

    var files = fs.readdirSync('apis/exchanges');
    var configFiles = {};
    var regex = /^(.*)\.json$/;
    var matches;
    var key;
    for (var i = 0; i < files.length; i++) {
        if (regex.test(files[i])) {
            matches = files[i].match(regex);
            key = matches[1].charAt(0).toLowerCase() + matches[1].slice(1);
            configFiles[key] = require('../apis/exchanges/' + matches[0]);
        }
    }

    return configFiles;
};

exports._userMapper = null;

var _getUserMapper = function () {

    if (exports._userMapper === null) {
        exports._userMapper = new UserMapper();
    }

    return exports._userMapper;
};

exports._configMapper = null;

var _getConfigMapper = function () {

    if (exports._configMapper === null) {
        exports._configMapper = new ConfigMapper();
    }

    return exports._configMapper;
};

exports.index = function (req, res) {

    var message = (req.protocol == 'http') ?
        'Your connection is\'t secure. Don\'t submit this form over a public network.' :
        '';

    var exchangeDefs = _getExchangeConfigs();
    _getConfigMapper().findAll(function (err, config) {

        if (err) {
            winston.err('configMapper.findAll: ' + err);
            return res.send('Error getting confguration.');
        }

        var currentExchange = config.get('exchangeClass');
        var exchangeCurrency = config.get('exchangeCurrency');
        var robocoinTestMode = config.get('robocoin.testMode');
        var bitstampTestMode = (config.get('exchangeClass') == 'MockBitstamp');
        var kioskCurrency = config.get('kioskCurrency');
        var exchangeToKioskConversionRate = config.get('exchangeToKioskConversionRate') || '';
        var supportedCurrencies = ['CAD', 'USD'];

        return res.render('configurationIndex', {
            currentExchange: currentExchange,
            exchangeCurrency: exchangeCurrency,
            robocoinTestMode: robocoinTestMode,
            bitstampTestMode: bitstampTestMode,
            csrfToken: req.csrfToken(),
            securityMessage: message,
            exchangeDefs: exchangeDefs,
            kioskCurrency: kioskCurrency,
            exchangeToKioskConversionRate: exchangeToKioskConversionRate,
            supportedCurrencies: supportedCurrencies
        });
    });
};

exports.saveExchange = function (req, res) {

    var username = req.body.username;
    var password = req.body.password;
    delete req.body.username;
    delete req.body.password;
    delete req.body._csrf;

    async.series([
        function (asyncCallback) {
            _getUserMapper().findByLogin(username, password, asyncCallback);
        },
        function (asyncCallback) {

            var config = Config.getInstance();
            for (var configParam in req.body) {
                config.set(configParam, req.body[configParam]);
            }

            _getConfigMapper().save(config, asyncCallback);
        }
    ], function (err) {
        if (err) return res.send(err, 400);
        return res.send('Exchange configuration saved');
    });
};

exports.saveRobocoin = function (req, res) {

    var apiKey = req.body.apiKey;
    var apiSecret = req.body.apiSecret;
    var testMode = (req.body.testMode == 'true') ? '1' : '0';
    var username = req.body.username;
    var password = req.body.password;

    async.series([
        function (asyncCallback) {
            _getUserMapper().findByLogin(username, password, asyncCallback);
        },
        function (asyncCallback) {

            var config = Config.getInstance();
            config.set('robocoin.key', apiKey);
            config.set('robocoin.secret', apiSecret);
            config.set('robocoin.testMode', testMode);

            _getConfigMapper().save(config, asyncCallback);
        }
    ], function (err) {
        if (err) return res.send(err, 400);
        return res.send('Robocoin configuration saved');
    });
};

exports.saveCurrencyConversion = function (req, res) {

    var username = req.body.username;
    var password = req.body.password;
    var kioskCurrency = req.body.kioskCurrency;
    var conversionRate = req.body.conversionRate;

    async.series([
        function (asyncCallback) {
            _getUserMapper().findByLogin(username, password, asyncCallback);
        },
        function (asyncCallback) {

            var config = Config.getInstance();
            config.set('kioskCurrency', kioskCurrency);
            config.set('exchangeToKioskConversionRate', conversionRate);
            _getConfigMapper().save(config, asyncCallback);
        }
    ], function (err) {
        if (err) return res.send(err, 400);
        return res.send('Currency conversion saved');
    });
};
