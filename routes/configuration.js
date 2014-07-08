'use strict';

var ConfigMapper = require('../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var winston = require('winston');
var Config = require('../lib/Config');
var UserMapper = require('../data_mappers/UserMapper');
var userMapper = new UserMapper();
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

exports.index = function (req, res) {

    var message = (req.protocol == 'http') ?
        'Your connection is\'t secure. Don\'t submit this form over a public network.' :
        '';

    var exchangeDefs = _getExchangeConfigs();
    configMapper.findAll(function (err, config) {

        if (err) {
            winston.log('configMapper.findAll: ' + err);
            return res.send('Error getting confguration.');
        }

        var currentExchange = config.get('exchangeClass');
        var currency = config.get('currency');
        var robocoinTestMode = config.get('robocoin.testMode');
        var bitstampTestMode = (config.get('exchangeClass') == 'MockBitstamp');

        return res.render('configurationIndex', {
            currentExchange: currentExchange,
            currency: currency,
            robocoinTestMode: robocoinTestMode,
            bitstampTestMode: bitstampTestMode,
            csrfToken: req.csrfToken(),
            securityMessage: message,
            exchangeDefs: exchangeDefs
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
            userMapper.findByLogin(username, password, asyncCallback);
        },
        function (asyncCallback) {

            var config = Config.getInstance();
            for (var configParam in req.body) {
                config.set(configParam, req.body[configParam]);
            }

            configMapper.save(config, asyncCallback);
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
            userMapper.findByLogin(username, password, asyncCallback);
        },
        function (asyncCallback) {

            var config = Config.getInstance();
            config.set('robocoin.key', apiKey);
            config.set('robocoin.secret', apiSecret);
            config.set('robocoin.testMode', testMode);

            configMapper.save(config, asyncCallback);
        }
    ], function (err) {
        if (err) return res.send(err, 400);
        return res.send('Robocoin configuration saved');
    });
};
