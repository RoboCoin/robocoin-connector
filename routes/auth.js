'use strict';

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
    res.redirect('/login');
};
