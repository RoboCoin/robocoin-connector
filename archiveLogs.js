'use strict';

var async = require('async');
var LogMapper = require('./data_mappers/LogMapper');
var LogArchiveMapper = require('./data_mappers/LogArchiveMapper');

var logMapper = new LogMapper();
var logArchiveMapper = new LogArchiveMapper();

var archiveLogs = function () {

    var areLogsToArchive = false;

    async.waterfall([
        function (waterfallCallback) {

            logMapper.findForArchive(waterfallCallback);
        },
        function (logsForArchive, waterfallCallback) {

            if (logsForArchive.length > 0) {
                areLogsToArchive = true;
            } else {
                return waterfallCallback(null, null);
            }

            var logsAsString = JSON.stringify(logsForArchive);
            var mostRecentTs = logsForArchive[0].ts;

            logArchiveMapper.save(logsAsString, function (err) {

                if (err) return waterfallCallback(err);

                return waterfallCallback(null, mostRecentTs);
            });
        },
        function (mostRecentTs, waterfallCallback) {

            if (!areLogsToArchive) {
                return waterfallCallback();
            }

            logMapper.deleteOnFrom(mostRecentTs, waterfallCallback);
        }
    ], function (err) {

        if (err) {
            console.error('Error archiving logs: ' + err);
        } else {
            console.log('Done archiving logs');
        }
    });
};

setInterval(function () { archiveLogs(); }, 86400000); // run once a day
