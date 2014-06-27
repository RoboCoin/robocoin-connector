'use strict';

/**
 * This module runs a periodic job from the command line, just as it does from the main app. This is useful for testing.
 *
 * @type {exports}
 */

var jobs = require('../periodicJobs');

var randomNumber = Math.random() * 3;

if (randomNumber > 1) {
    jobs.runAutoconnector(function (err) {
        if (err) console.log(err);
        process.exit(0);
    });
} else {
    jobs.batchProcess(function (err) {
        if (err) console.log(err);
        process.exit(0);
    });
}
