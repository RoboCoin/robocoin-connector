'use strict';

var generateSecret = require('./generateSecret');
var bcrypt = require('bcrypt');
var Connection = require('../data_mappers/PgConnection');

var username = process.argv[2];
var secret = generateSecret();

bcrypt.genSalt(10, function (err, salt) {
   bcrypt.hash(secret, salt, function (err, hash) {

       Connection.getConnection().query(
           'INSERT INTO users (username, password_hash) VALUES (\'' + username + '\',\'' + hash + '\')',
           function (err) {

               if (err) console.log(err);

               console.log(secret);
               process.exit(0);
           }
       );
   });
});