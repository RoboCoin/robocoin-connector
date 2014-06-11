'use strict';

var robocoin = require('../apis/Robocoin').getInstance();

exports.getTransactions = function (req, res) {

    var sinceDate = new Date(req.body.sinceDate);

    robocoin.getTransactions(sinceDate.getTime(), function (err, transactions) {

        if (err) return res.json(500, {});

        return res.json(transactions);
    });
};