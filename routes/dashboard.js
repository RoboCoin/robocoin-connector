'use strict';

var TransactionMapper = require('../data_mappers/TransactionMapper');
var transactionMapper = new TransactionMapper();

exports.index = function (req, res) {
    res.render('dashboardIndex');
};

exports.summary = function (req, res) {

    transactionMapper.buildProfitReport(function (err, rows) {

        if (err) return res.send(500, err);

        res.send(rows);
    });
};
