'use strict';

var fs = require('fs');

var config = require(__dirname + '/../../connectorConfig.json');
config.save = function (callback) {
    fs.writeFile(
            __dirname + '/../../connectorConfig.json',
        JSON.stringify(config, null, '\t'),
        function (err) {

            if (err) return callback('Error saving configuration: ' + err);
            return callback();
        }
    );
};

module.exports = exports = config;