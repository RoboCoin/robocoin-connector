'use strict';

var Autoconnector = require('./apis/Autoconnector');
var autoconnector = new Autoconnector();
var BatchProcessor = require('./apis/BatchProcessor');
var batchProcessor = new BatchProcessor();

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
