'use strict';

var addUser = require('../services/addUser');
var ConfigMapper = require('../data_mappers/ConfigMapper');
var Config = require('../lib/Config');
var setupRobocoin = require('../services/setupRobocoin');
var async = require('async');

var configMapper = new ConfigMapper();
var config = Config.getInstance();

exports.get = function (req, res) {
    return res.render('setup', { csrfToken: req.csrfToken() });
};

exports.set = function (req, res) {

    var createdPassword;

    async.series([
        function (asyncCallback) {
            addUser.add(req.body.romitEmailAddress, function (err, password) {
                createdPassword = password;
                return asyncCallback(err);
            });
        },
        function (asyncCallback) {
            config.set(null, 'PING_URL', req.protocol + '://' + req.host);
            configMapper.save(null, config, function (err) {
                return asyncCallback(err);
            });
        },
        function (asyncCallback) {
            setupRobocoin.initialize(req.body.romitApiKey, req.body.romitApiSecret, function (err) {
                return asyncCallback(err);
            });
        }
    ], function (err) {
        if (err) return res.send('Error setting up Romit: ' + err);
        return res.render('setup-complete', {
            loginEmail: req.body.romitEmailAddress,
            loginPassword: createdPassword
        });
    });
};
