'use strict';

var KioskMapper = require('../data_mappers/KioskMapper');
var kioskMapper = new KioskMapper();

exports.index = function (req, res) {

    kioskMapper.findAll(function (err, kiosks) {

        return res.render('kiosksIndex', {
            csrfToken: req.csrfToken(),
            kiosks: kiosks,
            error: err
        });
    });
};

exports.addNewKiosk = function (req, res) {

    var kiosk = {
        id: req.body.id,
        name: req.body.name
    };

    kioskMapper.add(kiosk, function (err) {

        if (err) return res.send(400, err);

        return res.send('Added kiosk');
    });
};

exports.update = function (req, res) {

    var kiosk = {
        id: req.body.id,
        name: req.body.name
    };

    kioskMapper.update(kiosk, req.body.existingKioskId, function (err) {

        if (err) return res.send(400, err);

        return res.send('Updated kiosk');
    });
};
