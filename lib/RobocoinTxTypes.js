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
Object.defineProperty(RobocoinTxTypes, 'ROBOCOIN_FEE', {
    writable: false,
    enumerable: true,
    configurable: false,
    value: 'ROBOCOIN_FEE'
});

module.exports = RobocoinTxTypes;
