'use strict';

var winston = require('winston');

var Config = function () {
    this._params = {};
    this._dirtyParams = {};
};

Config.prototype.updateParams = function (params) {

    for (var i = 0; i < params.length; i++) {

        if (params[i].kiosk_id === null) {
            params[i].kiosk_id = '';
        }

        this._params[params[i].kiosk_id + '-' + params[i].param_name] = params[i];
    }

    this._dirtyParams = {};
    return this;
};

Config.prototype.get = function (kioskId, paramName) {

    if (kioskId === null) {
        kioskId = '';
    }

    var key = kioskId + '-' + paramName;

    if (typeof this._params[key] === 'undefined') {
        winston.warn('Key ' + key + ' not found in config');
        return null;
    }

    return this._params[key].param_value;
};

Config.prototype.getAllForKiosk = function (kioskId) {
    console.log('getting all for kiosk: ' + kioskId);
    var outputParams = {};

    for (var key in this._params) {
        if (this._params[key].kiosk_id == kioskId) {
            outputParams[this._params[key].param_name] = this._params[key].param_value;
        }
    }

    if (Object.keys(outputParams).length === 0) {
        winston.warn('No config found for kiosk Id: ' + kioskId);
    }
    console.log(outputParams);
    return outputParams;
};

Config.prototype.set = function (kioskId, param, value) {

    if (kioskId === null) {
        kioskId = '';
    }

    var parameterKey = kioskId + '-' + param;
    var parameterObject = { kiosk_id: kioskId, param_name: param, param_value: String(value) };

    console.log('parameterKey', parameterKey);
    console.log('parameterObject', parameterObject);
    this._params[parameterKey] = parameterObject;
    this._dirtyParams[parameterKey] = parameterObject;
};

Config.prototype.getDirtyForKiosk = function (kioskId) {

    if (kioskId === null) {
        kioskId = '';
    }

    var dirtyKeys = Object.keys(this._dirtyParams);
    var outputParams = {};
    for (var i = 0; i < dirtyKeys.length; i++) {
        if (this._dirtyParams[dirtyKeys[i]].kiosk_id == kioskId) {
            outputParams[this._dirtyParams[dirtyKeys[i]].param_name] = this._dirtyParams[dirtyKeys[i]].param_value;
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