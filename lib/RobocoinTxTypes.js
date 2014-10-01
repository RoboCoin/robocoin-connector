'use strict';

var RobocoinTxTypes = {};
Object.defineProperty(RobocoinTxTypes, 'SEND', {
    writable: false,
    enumerable: true,
    configurable: false,
    value: 'OPERATOR_SEND'
});
Object.defineProperty(RobocoinTxTypes, 'RECV', {
    writable: false,
    enumerable: true,
    configurable: false,
    value: 'OPERATOR_RECV'
});

module.exports = RobocoinTxTypes;
