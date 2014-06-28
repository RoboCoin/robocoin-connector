'use strict';

var generateSecret = require('./generateSecret');
var bcrypt = require('bcrypt');

var username = process.argv[2];
var secret = generateSecret();

bcrypt.genSalt(10, function (err, salt) {
   bcrypt.hash(secret, salt, function (err, hash) {

       console.log('username: ' + username);
       console.log('password: ' + secret);
       console.log('hash: ' + hash);
       process.exit(0);
   });
});