'use strict';

var Bitstamp = require('../../../apis/exchanges/Bitstamp');
var sinon = require('sinon');
var assert = require('assert');
var Config = require('../../../lib/Config');

describe('Bitstamp', function () {

    var bitstamp;

    beforeEach(function () {

        var config = Config.getInstance();
        config.updateParams([
            {
                kiosk_id: '1',
                param_name: 'bitstamp.baseUrl',
                param_value: 'https://www.bitstamp.net/api'
            },
            {
                kiosk_id: '1',
                param_name: 'bitstamp.clientId',
                param_value: '24916868473977308962'
            },
            {
                kiosk_id: '1',
                param_name: 'bitstamp.secret',
                param_value: 'ZyyuQ9bTONt1axtVdLkw'
            },
            {
                kiosk_id: '1',
                param_name: 'bitstamp.apiKey',
                param_value: 'zwr01RLxDGPxbIHEqeNn'
            }
        ]);
        Bitstamp.clearInstance();
        bitstamp = Bitstamp.getInstance(config.getAllForKiosk('1'));

        sinon
            .stub(bitstamp, '_request')
            .callsArgWith(1, null, { statusCode: 200 }, {});
        sinon.stub(bitstamp, '_getNonce').returns(1402016237000);
    });

    it('supplies authentication parameters with each request', function (done) {

        bitstamp._post('/some_url', function (err, res) {

            var expectedOptions = {
                url: 'https://www.bitstamp.net/api/some_url',
                form: {
                    key: 'zwr01RLxDGPxbIHEqeNn',
                    signature: 'FD6AE5117EBE7D33B4708AD7ED777C12B689D8053616E1407C4DA799EE0DC297',
                    nonce: 1402016237000
                },
                method: 'POST',
                json: true
            };

            assert(bitstamp._request.calledWith(expectedOptions));

            done(err);
        });
    });

    it('adds optional parameters to the form', function (done) {

        bitstamp._post('/some_url', { optional: true }, function (err, res) {

            var expectedOptions = {
                url: 'https://www.bitstamp.net/api/some_url',
                form: {
                    key: 'zwr01RLxDGPxbIHEqeNn',
                    signature: 'FD6AE5117EBE7D33B4708AD7ED777C12B689D8053616E1407C4DA799EE0DC297',
                    nonce: 1402016237000,
                    optional: true
                },
                method: 'POST',
                json: true
            };

            assert(bitstamp._request.calledWith(expectedOptions));

            done(err);
        });
    });
});
