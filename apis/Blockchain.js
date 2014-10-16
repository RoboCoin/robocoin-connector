'use strict';

var config = require('../lib/Config');
var request = require('request');
var MockBlockchain = require('./MockBlockchain');

var Blockchain = function () {

    this._request = request;
};

Blockchain.prototype.getConfirmationsForTransaction = function (transactionHash, callback) {

    this._request({
            url: 'http://btc.blockr.io/api/v1/tx/info/' + transactionHash,
            json: true
        },
        function (err, response, body) {

            if (body.code == 200 && body.status == 'success' && body.data) {

                return callback(null, body.data.confirmations);

            } else {

                return callback('Error getting confirmations from blockchain: ' + body.message);
            }
        }
    );
};

Blockchain.prototype.isMock = function () {
    return false;
};

var blockchain = null;

module.exports = {
    getInstance: function (config) {

        if (config.get(null, 'robocoin.testMode') == '0') {
            if (blockchain === null || blockchain.isMock()) {
                blockchain = new Blockchain();
            }
        } else {
            if (blockchain === null || !blockchain.isMock()) {
                blockchain = new MockBlockchain();
            }
        }

        return blockchain;
    },
    clearInstance: function () {
        blockchain = null;
    }
};
