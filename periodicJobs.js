'use strict';

var Autoconnector = require('./apis/Autoconnector');
var autoconnector = new Autoconnector();
var BatchProcessor = require('./apis/BatchProcessor');
var batchProcessor = new BatchProcessor();
var PartialFiller = require('./apis/PartialFiller');
var partialFiller = new PartialFiller();
var intervalId;
var AUTOCONNECTOR_INTERVAL = 60000;

var autoconnectorRunErrorHandler = function (err) {
    if (err) return console.error('Autoconnector run error: ' + err);
};

exports.batchProcess = function (callback) {

    batchProcessor.run(callback);
};

exports.runAutoconnector = function (errorHandler) {

    if (!errorHandler) {
        errorHandler = autoconnectorRunErrorHandler;
    }

    autoconnector.run(errorHandler);
};

exports.startInterval = function () {

    console.log('starting periodic jobs');
    intervalId = setInterval(function () {

        var randomNumber = Math.ceil((Math.random() * 10));

        // most of the time, run the autoconnector
        if (randomNumber > 2) {
            exports.runAutoconnector();
        } else if (randomNumber == 2) {
            // but sometimes, do the batch rollup
            exports.batchProcess();
        } else {
            // and sometimes fill partials
            console.log('filling partials...');
            partialFiller.run(function (err) {
                if (err) console.error('Partial filling error: ' + err);
            });
        }

    }, AUTOCONNECTOR_INTERVAL);
};

exports.stopInterval = function () {

    console.log('stopping periodic jobs');
    clearInterval(intervalId);
};
