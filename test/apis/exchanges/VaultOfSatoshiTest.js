'use strict';

var VaultOfSatoshi = require('../../../apis/exchanges/VaultOfSatoshi');
var sinon = require('sinon');
var assert = require('assert');
//var configFile = require('../../../../connectorConfig').vaultOfSatoshi;
var Config = require('../../../lib/Config');

describe('VaultOfSatoshi', function() {

    var vaultOfSatoshi;

    beforeEach(function () {

        var config = Config.getInstance();
        config.set('1', 'vaultOfSatoshi.apiSecret', 'whatever');
        config.set('1', 'vaultOfSatoshi.baseUrl', 'https://api.vaultofsatoshi.com');
        config.set('1', 'vaultOfSatoshi.apiKey', '0f04e90b19ef0437596d76287ce289583219efcc6c4403ecc9f644fd92a654c8');

        /*for (var param in configFile) {
            config.set('1', 'vaultOfSatoshi.' + param, configFile[param]);
        }*/

        vaultOfSatoshi = VaultOfSatoshi.getInstance(config.getAllForKiosk('1'));
        sinon.stub(vaultOfSatoshi, '_getNonce')
            .returns(1404234324);
    });

    afterEach(function () {
        vaultOfSatoshi._getNonce.restore();
        VaultOfSatoshi.clearInstance();
    });

    it('adds authentication parameters to each request', function (done) {

        sinon.stub(vaultOfSatoshi, '_request')
            .callsArgWith(1, null, { statusCode: 200 }, { status: 'success' });

        vaultOfSatoshi._post('/info/account', function (err, res) {

            var expectedParameters = {
                url: 'https://api.vaultofsatoshi.com/info/account',
                method: 'POST',
                headers: {
                    'Api-Key': '0f04e90b19ef0437596d76287ce289583219efcc6c4403ecc9f644fd92a654c8',
                    'Api-Sign': 'YjA5MGJmZGUyNDcxNWQ3YzdhYzMzYzZjNmE0ODcyN2VhZDhjZmRlOWY0MTU0NTBmZTM3MzM5OGMzNjRjYTBiNDk5Y2M1ZGEzMDNkNTZmMDliMzYxZWZiZDQ5MTYzOWYzNGIwODE3MTRkZWVlZDAyZWE5MjJmMWMzNjdjMjc2NTk='
                },
                form: {
                    nonce: 1404234324
                },
                json: true
            };

            assert(vaultOfSatoshi._request.calledWith(expectedParameters));

            done(err);
        });
    });

    it('adds miners fee to withdraws', function (done) {

        sinon.stub(vaultOfSatoshi, '_post')
            .callsArg(2);

        vaultOfSatoshi.withdraw(0.01, 'someaddress', function (err) {

            assert(vaultOfSatoshi._post.calledWith(
                '/withdraw/transfer',
                { address: 'someaddress', currency: 'BTC', quantity: 0.0105 }
            ));

            done(err);
        });
    });
});
