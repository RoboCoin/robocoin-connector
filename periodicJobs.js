'use strict';

var Autoconnector = require('./apis/Autoconnector');
var autoconnector = new Autoconnector();
var BatchProcessor = require('./apis/BatchProcessor');
var batchProcessor = new BatchProcessor();
var intervalId;
var AUTOCONNECTOR_INTERVAL = 60000;

var autoconnectorRunErrorHandler = function (err) {
    if (err) return console.log('Autoconnector run error: ' + err);
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

        var randomNumber = (Math.random() * 10);

        // most of the time, run the autoconnector
        if (randomNumber > 1) {
            exports.runAutoconnector();
        } else {
            // but sometimes, do the batch rollup
            exports.batchProcess();
        }

    }, AUTOCONNECTOR_INTERVAL);
};

exports.stopInterval = function () {

    console.log('stopping periodic jobs');
    clearInterval(intervalId);
};
