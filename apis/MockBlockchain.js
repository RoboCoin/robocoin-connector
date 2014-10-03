'use strict';

var config = require('../lib/Config');
var request = require('request');

var MockBlockchain = function () {
};

MockBlockchain.prototype.getConfirmationsForTransaction = function (transactionHash, callback) {

    var confirmations = Math.floor((Math.random() * (20 - 0 + 1)) + 0);

    return callback(null, confirmations);
};

MockBlockchain.prototype.isMock = function () {
    return true;
};

module.exports = MockBlockchain;
