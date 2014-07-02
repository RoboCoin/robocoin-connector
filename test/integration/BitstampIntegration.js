'use strict';

var Bitstamp = require('../../apis/exchanges/Bitstamp');
var config = require('../../../connectorConfig').bitstamp;
var assert = require('assert');

describe('Bitstamp', function () {

    var bitstamp;

    beforeEach(function () {
        bitstamp = Bitstamp.getInstance(config);
    });

    afterEach(function () {
        Bitstamp.clearInstance();
    });

    it('gets prices', function (done) {

        bitstamp.getPrices(function (err, prices) {

            assert(prices.buyPrice);
            assert(prices.sellPrice);

            done(err);
        });
    });

    it('withdraws', function (done) {

        bitstamp.withdraw(0.01, '13nXZmeBHF26q8wcwhzxuxN6d7H4xYLzHq', function (err) {

            done(err);
        });
    });
});
