'use strict';

var LogMapper = require('../data_mappers/LogMapper');
var logMapper = new LogMapper();

exports.index = function (req, res) {

    logMapper.findAll(function (err, logs) {

        if (err) return res.send('There was an error getting the logs: ' + err);

        res.render('logs', { logs: logs });
    });
};
