'use strict';

var Bitstamp = require('../../apis/Bitstamp');
var sinon = require('sinon');
var assert = require('assert');

describe('Bitstamp', function () {

    var bitstamp;

    beforeEach(function () {

        bitstamp = new Bitstamp({
            clientId: '123',
            apiKey: '234',
            secret: '345',
            baseUrl: 'https://www.bitstamp.net/api'
        });

        sinon
            .stub(bitstamp, '_request')
            .callsArgWith(1, null, { statusCode: 200 }, {});
        sinon.stub(bitstamp, '_getNonce').returns(1402016237000);
    });

    afterEach(function () {
        bitstamp._request.restore();
    });

    it('supplies authentication parameters with each request', function (done) {

        bitstamp.post('/some_url', function (err, res) {

            var expectedOptions = {
                url: 'https://www.bitstamp.net/api/some_url',
                form: {
                    key: '234',
                    signature: '34155AE63C167C1E8E47FEB6FAB87B0F38D4C12990E9072AE2B5AD085069820A',
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

        bitstamp.post('/some_url', { optional: true }, function (err, res) {

            var expectedOptions = {
                url: 'https://www.bitstamp.net/api/some_url',
                form: {
                    key: '234',
                    signature: '34155AE63C167C1E8E47FEB6FAB87B0F38D4C12990E9072AE2B5AD085069820A',
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
