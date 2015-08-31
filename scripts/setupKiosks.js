'use strict';

var setupKiosks = require('../services/setupKiosks');

setupKiosks.initialize(function (err) {
    if (err) {
        console.log(err);
        return process.exit(1);
    } else {
        return process.exit(0);
    }
});
