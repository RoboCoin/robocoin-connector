'use strict';

var async = require('async');
var Connection = require('../data_mappers/PgConnection');
var fs = require('fs');
var path = require('path');

exports.run = function (callback) {

    async.waterfall([
        function (waterfallCallback) {

            Connection.getConnection().query('SELECT MAX(version) FROM db_versions', function (err, result) {

                if (err) return waterfallCallback('Error getting latest DB version: ' + err);

                return waterfallCallback(null, result.rows[0].max.toString());
            });
        },
        function (maxVersion, waterfallCallback) {

            fs.readdir('./scripts/db_updates', function (err, updateScripts) {

                if (err) return waterfallCallback('Error reading update scripts: ' + err);

                updateScripts.sort();

                return waterfallCallback(null, maxVersion, updateScripts);
            });
        },
        function (maxVersion, updateScripts, waterfallCallback) {

            var fileContents;
            var commands;
            var updateScriptBasename;
            async.eachSeries(updateScripts, function (updateScript, eachUpdateScriptCallback) {

                updateScriptBasename = path.basename(updateScript, '.sql');
                if (updateScriptBasename > maxVersion) {

                    fileContents = fs.readFileSync('./scripts/db_updates/' + updateScriptBasename + '.sql').toString('utf8');
                    commands = fileContents.split(';');
                    // the last one will be empty
                    commands.splice(commands.length - 1, 1);

                    async.eachSeries(commands, function (command, eachCommandCallback) {

                        Connection.getConnection().query(command, eachCommandCallback);

                    }, function (err) {

                        if (err) {

                            return waterfallCallback('Error running migration: ' + err);

                        } else {

                            // when we've successfully run all commands in the script...
                            Connection.getConnection().query('INSERT INTO db_versions VALUES ($1)', [updateScriptBasename],
                                function (err) {

                                    if (err) {

                                        return eachUpdateScriptCallback('Error updating version: ' + err);

                                    } else {

                                        return eachUpdateScriptCallback();
                                    }
                                });
                        }
                    });

                } else {

                    return eachUpdateScriptCallback();
                }

            }, function (err) {
                if (err) return waterfallCallback('Error running migration script: ' + err);
                return waterfallCallback();
            });
        }
    ], callback);
};
