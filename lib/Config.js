'use strict';

var Config = function (params) {
    this._params = params || {};
    this._dirtyParams = {};
};

Config.prototype.updateParams = function (params) {
    this._params = params;
    this._dirtyParams = {};
    return this;
};

Config.prototype.get = function (param) {
    return this._params[param];
};

Config.prototype.set = function (param, value) {
    this._params[param] = value;
    this._dirtyParams[param] = value;
};

Config.prototype.getDirty = function () {
    return this._dirtyParams;
};

Config.prototype.getAllParams = function () {
    return this._params;
};

Config.prototype.getParamsByPrefix = function (prefix) {

    var regex = new RegExp('^(' + prefix + '\.)');

    var outputParams = [];
    var shortParamName;
    for (var paramName in this._params) {

        if (regex.test(paramName)) {

            shortParamName = paramName.replace(regex, function (match, group1) {
                return match.replace(group1, '');
            });
            outputParams[shortParamName] = this._params[paramName];
        }
    }

    return outputParams;
};

var instance = null;
module.exports = {
    getInstance: function () {

        if (instance === null) {
            instance = new Config();
        }

        return instance;
    }
};