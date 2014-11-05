'use strict';

var _flags = {};

var _FlagName = function (name) {
    this._name = name;
};
_FlagName.prototype.on = function () {
    _flags[this._name] = true;
};
_FlagName.prototype.off = function () {
    _flags[this._name] = false;
};

var Flag = {
    set: function (name) {
        return new _FlagName(name);
    },
    isSet: function (name) {
        return _flags[name];
    },
    clearAll: function () {
        _flags = {};
    },
    PROCESSING: 'processing'
};

module.exports = Flag;
