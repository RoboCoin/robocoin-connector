'use strict';

var Flag = require('../../lib/Flag');
var assert = require('assert');

describe('Flag', function () {

    beforeEach(function () {
        Flag.clearAll();
    });

    it('can set a flag to on', function () {

        Flag.set('running').on();
        assert(Flag.isSet('running'));
    });

    it('returns flag as false when never set', function () {
        assert(!Flag.isSet('never set'));
    });

    it('can set a flag to off', function () {

        Flag.set('running').off();
        assert(!Flag.isSet('running'));
    });
});
