'use strict';

var winston = require('winston');

exports.loginIndex = function (req, res) {

    var message;
    var errors = req.flash('error');
    if (errors.length > 0) {
        message = errors;
    }

    res.render('loginIndex', {
        message: message,
        csrfToken: req.csrfToken()
    });
};

exports.logout = function (req, res) {
    req.logout();
    req.session.destroy(function (err) {
        if (err) winston.error('Error destroying session: ' + err);
    });
    res.redirect('/login');
};
