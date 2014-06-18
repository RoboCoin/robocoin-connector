'use strict';

var Bitstamp = require('../../../apis/exchanges/Bitstamp');
var sinon = require('sinon');
var assert = require('assert');

describe('Bitstamp', function () {

    var bitstamp;

    beforeEach(function () {

        Bitstamp.clearInstance();
        bitstamp = Bitstamp.getInstance();

        sinon
            .stub(bitstamp, '_request')
            .callsArgWith(1, null, { statusCode: 200 }, {});
        sinon.stub(bitstamp, '_getNonce').returns(1402016237000);
    });

    it('supplies authentication parameters with each request', function (done) {

        bitstamp.post('/some_url', function (err, res) {

            var expectedOptions = {
                url: 'https://www.bitstamp.net/api/some_url',
                form: {
                    key: 'cwoEIvpFp55moesPp6KEXBnm53u6HYLC',
                    signature: 'C2D398F384F7E77C22F87269F49E4D0C8418B89AE79BABD1E01E59EE5176584C',
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
                    key: 'cwoEIvpFp55moesPp6KEXBnm53u6HYLC',
                    signature: 'C2D398F384F7E77C22F87269F49E4D0C8418B89AE79BABD1E01E59EE5176584C',
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
