'use strict';

var request = require('request');

var Blockchain = function () {

    this._request = request;
};

Blockchain.prototype.getConfirmationsForTransaction = function (transactionHash, callback) {

    this._request({
            url: 'http://btc.blockr.io/api/v1/tx/info/' + transactionHash,
            json: true
        },
        function (err, response, body) {

            console.log('response from blockr:', err, response, body);
            if (body.code == 200 && body.status == 'success' && body.data) {

                return callback(null, body.data.confirmations);

            } else {

                return callback('Error getting confirmations from blockchain: ' + body.message);
            }
        }
    );
};

module.exports = Blockchain;
