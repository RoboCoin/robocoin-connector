'use strict';

var config = require('../lib/Config');

exports.index = function (req, res) {

    var currentExchange = config.exchangeClass;
    var robocoinTestMode = config.robocoin.testMode;
    var bitstampTestMode = (config.exchangeClass == 'MockBitstamp');

    return res.render('configurationIndex', {
        currentExchange: currentExchange,
        robocoinTestMode: robocoinTestMode,
        bitstampTestMode: bitstampTestMode
    });
};

exports.saveExchange = function (req, res) {

    var clientId = req.body.clientId;
    var apiKey = req.body.apiKey;
    var apiSecret = req.body.apiSecret;
    var testMode = (req.body.testMode == 'true');

    config.bitstamp.clientId = clientId;
    config.bitstamp.apiKey = apiKey;
    config.bitstamp.secret = apiSecret;
    if (testMode) {
        config.exchangeClass = 'MockBitstamp';
    } else {
        config.exchangeClass = 'Bitstamp';
    }

    config.save(function (err) {
        if (err) return res.send(err);
        return res.send('Exchange configuration saved');
    });
};

exports.saveRobocoin = function (req, res) {

    var apiKey = req.body.apiKey;
    var apiSecret = req.body.apiSecret;
    var testMode = (req.body.testMode == 'true') ? true : false;

    config.robocoin.key = apiKey;
    config.robocoin.secret = apiSecret;
    config.robocoin.testMode = testMode;
    config.save(function (err) {
        if (err) return res.send(err);
        return res.send('Robocoin configuration saved');
    });
};
