'use strict';

var Bitstamp = require('../../apis/exchanges/Bitstamp');
var configFile = require('../../../connectorConfig').bitstamp;
var assert = require('assert');
var Config = require('../../lib/Config');

describe('Bitstamp', function () {

    var bitstamp;


    beforeEach(function () {

        var config = Config.getInstance();

        for (var param in configFile) {
            config.set('1', 'bitstamp.' + param, configFile[param]);
        }
        bitstamp = Bitstamp.getInstance(config.getAllForKiosk('1'));
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
