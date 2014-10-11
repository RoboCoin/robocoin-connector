'use strict';

var ConfigMapper = require('../data_mappers/ConfigMapper');
var winston = require('winston');
var Config = require('../lib/Config');
var UserMapper = require('../data_mappers/UserMapper');
var async = require('async');
var fs = require('fs');
var KioskMapper = require('../data_mappers/KioskMapper');
var kioskMapper = new KioskMapper();
var periodicJobs = require('../periodicJobs');

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
            winston.error('configMapper.findAll: ' + err);
            return res.send('Error getting confguration.');
        }

        var currentExchange = config.get(req.session.kioskId, 'exchangeClass');
        var exchangeCurrency = config.get(req.session.kioskId, 'exchangeCurrency');
        var robocoinTestMode = config.get(req.session.kioskId, 'robocoin.testMode');
        var bitstampTestMode = (config.get(req.session.kioskId, 'exchangeClass') == 'MockBitstamp');
        var kioskCurrency = config.get(req.session.kioskId, 'kioskCurrency');
        var exchangeToKioskConversionRate = config.get(req.session.kioskId, 'exchangeToKioskConversionRate') || '';
        var supportedCurrencies = ['CAD', 'USD'];

        kioskMapper.findAll(function (err, kiosks) {

            if (err) winston.error('Error getting kiosks: ' + err);

            _getConfigMapper().findAll(function (err, config) {

                if (err) winston.error('Error getting config: ' + err);

                var configuredKiosks = [];
                for (var i = 0; i < kiosks.length; i++) {
                    if (Object.keys(config.getAllForKiosk(kiosks[i].id)).length > 0) {
                        configuredKiosks.push(kiosks[i].id);
                    }
                }
                
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
                    supportedCurrencies: supportedCurrencies,
                    kiosks: kiosks,
                    autoconnectorEnabled: config.get(null, 'autoconnectorEnabled'),
                    robocoinConfigured: (config.get(null, 'robocoin.key') && config.get(null, 'robocoin.secret')),
                    configuredKiosks: JSON.stringify(configuredKiosks)
                });
            });
        });
    });
};

exports.saveExchange = function (req, res) {

    var username = req.body.username;
    var password = req.body.password;
    var kioskId = req.body.kioskId;
    delete req.body.username;
    delete req.body.password;
    delete req.body.kioskId;
    delete req.body._csrf;

    async.series([
        function (asyncCallback) {
            _getUserMapper().findByLogin(username, password, asyncCallback);
        },
        function (asyncCallback) {

            var config = Config.getInstance();
            for (var configParam in req.body) {
                config.set(kioskId, configParam, req.body[configParam]);
            }

            _getConfigMapper().save(kioskId, config, asyncCallback);
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
            config.set(null, 'robocoin.key', apiKey);
            config.set(null, 'robocoin.secret', apiSecret);
            config.set(null, 'robocoin.testMode', testMode);

            _getConfigMapper().save(null, config, asyncCallback);
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
    var kioskId = req.body.kioskId;

    async.series([
        function (asyncCallback) {
            _getUserMapper().findByLogin(username, password, asyncCallback);
        },
        function (asyncCallback) {

            var config = Config.getInstance();
            config.set(kioskId, 'kioskCurrency', kioskCurrency);
            config.set(kioskId, 'exchangeToKioskConversionRate', conversionRate);
            _getConfigMapper().save(kioskId, config, asyncCallback);
        }
    ], function (err) {
        if (err) return res.send(err, 400);
        return res.send('Currency conversion saved');
    });
};

exports.toggleAutoconnector = function (req, res) {

    var nextState = req.body.nextState;
    var config = Config.getInstance();
    config.set(null, 'autoconnectorEnabled', nextState);

    if (nextState == 1) {
        periodicJobs.startInterval();
    } else {
        periodicJobs.stopInterval();
    }

    _getConfigMapper().save(null, config, function (err) {

        if (err) return res.send(500, 'Failed to toggle autoconnector');

        var message = 'Autoconnector ';
        message += (nextState == 1) ? 'enabled' : 'disabled';
        return res.send(message);
    });
};
