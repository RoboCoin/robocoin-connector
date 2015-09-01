'use strict';

'use strict';

var fs = require('fs');
var async = require('async');
var Connection = require('../data_mappers/PgConnection');

function runDbScript(scriptPath, callback) {

    scriptPath = './scripts/' + scriptPath;

    var fileContents = fs.readFileSync(scriptPath).toString('utf8');
    var commands = fileContents.split(';');
    // the last one will be empty
    commands.splice(commands.length - 1, 1);

    async.eachSeries(commands, function (command, callback) {

        Connection.getConnection().query(command, callback);

    }, function (err) {

        if (err) {

            return callback('Error running database initialization: ' + err);

        } else {

            return callback();
        }
    });
}

runDbScript('database.sql', function (err) {

    if (err) {

        console.error(err);
        return process.exit(1);

    } else {

        fs.readdir('./scripts/db_updates', function (err, files) {

            if (err) {

                console.error('Error reading update files: ' + err);
                return process.exit(1);

            } else {

                async.eachSeries(files, function (file, asyncCallback) {

                    runDbScript('db_updates/' + file, asyncCallback);

                }, function (err) {

                    if (err) {

                        console.error(err);
                        return process.exit(1);

                    } else {

                        console.log('Done');
                        process.exit(0);
                    }
                });
            }
        });
    }
});

