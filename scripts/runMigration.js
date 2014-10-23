'use strict';

var fs = require('fs');
var async = require('async');
var Connection = require('../data_mappers/PgConnection');

if (!process.argv[2]) {
    console.error('No file specified');
    process.exit(1);
}

var migration = process.argv[2];
var fileContents = fs.readFileSync('./scripts/db_updates/' + migration + '.sql').toString('utf8');
var commands = fileContents.split(';');
// the last one will be empty
commands.splice(commands.length - 1, 1);

async.eachSeries(commands, function (command, callback) {

    Connection.getConnection().query(command, callback);

}, function (err) {

    if (err) {

        console.error('Error running migration: ' + err);
        return process.exit(1);

    } else {

        Connection.getConnection().query('INSERT INTO db_versions VALUES ($1)', [migration], function (err) {

            if (err) {

                console.error('Error updating version: ' + err);
                return process.exit(1);

            } else {

                console.log('Done');
                return process.exit(0);
            }
        });
    }
});
