'use strict';

module.exports = {
    get: function (className) {
        return require('./exchanges/' + className).getInstance();
    }
};
