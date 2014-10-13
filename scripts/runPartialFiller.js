'use strict';

var PartialFiller = require('../apis/PartialFiller');

var partialFiller = new PartialFiller();
partialFiller.run(function (err) {

    if (err) {
        console.error('Error: ' + err);
        return process.exit(1);
    } else {
        process.exit(0);
    }

});