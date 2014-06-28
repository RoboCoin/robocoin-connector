'use strict';

var getRandomNumber = function (min, max) {
    return Math.floor((Math.random() * (max - min + 1)) + min);
};

var generateSecret = function () {

    var secret = '';
    var characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var length = getRandomNumber(10, 20);

    for (var i = 0; i < length; i++) {
        secret += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return secret;
};

module.exports = generateSecret;
