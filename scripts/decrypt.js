'use strict';

var prompt = require('prompt');
var crypto = require('crypto');

prompt.get({
    properties: {
        decryptionKey: {
            description: 'Decryption key'
        },
        encryptedText: {
            description: 'Encrypted text'
        }
    }
}, function (err, result) {

    if (err) {
        console.error(err);
        return process.exit(1);
    }

    var aesDecipher = crypto.createDecipher('aes-256-cbc', result.decryptionKey);
    var decryptedValue = aesDecipher.update(result.encryptedText, 'base64', 'utf8');
    decryptedValue += aesDecipher.final('utf8');

    console.log('Decrypted value: ', decryptedValue);
    process.exit(1);
});
