'use strict';

'use strict';

var fs = require('fs');
var async = require('async');
var Connection = require('../data_mappers/PgConnection');

var fileContents = fs.readFileSync('./scripts/database.sql').toString('utf8');
var commands = fileContents.split(';');
// the last one will be empty
commands.splice(commands.length - 1, 1);

async.eachSeries(commands, function (command, callback) {

    Connection.getConnection().query(command, callback);

}, function (err) {

    if (err) {

        console.error('Error running database initialization: ' + err);
        return process.exit(1);

    } else {

        console.log('Done');
        return process.exit(0);
    }
});

