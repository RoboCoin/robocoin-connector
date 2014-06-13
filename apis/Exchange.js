'use strict';

module.exports = {
    get: function (className) {
        return require('./' + className).getInstance();
    }
};
