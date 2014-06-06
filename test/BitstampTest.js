'use strict';

var Bitstamp = require('../apis/Bitstamp');
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
            .callsArg(1);
        sinon.stub(bitstamp, '_getNonce').returns(1402016237000);
    });

    afterEach(function () {

        bitstamp._request.restore();
    });

    it('supplies authentication parameters with each request', function (done) {

        bitstamp.post('/some_url', function (err, res) {

            var body = 'key=234&' +
                'signature=34155ae63c167c1e8e47feb6fab87b0f38d4c12990e9072ae2b5ad085069820a&' +
                'nonce=1402016237000'

            var expectedOptions = {
                url: 'https://www.bitstamp.net/api/some_url',
                body: body,
                method: 'POST'
            };

            assert(bitstamp._request.calledWith(expectedOptions));

            done(err);
        });
    });
});
