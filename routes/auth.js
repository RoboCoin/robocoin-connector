'use strict';

exports.loginIndex = function (req, res) {
    res.render('loginIndex', {
        csrfToken: req.csrfToken(),
        message: req.flash('error')
    });
};

exports.logout = function (req, res) {
    req.logout();
    res.redirect('/login');
};
