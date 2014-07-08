'use strict';

var Config = require('../../lib/Config');
var assert = require('assert');

describe('Config', function () {

    it('initializes from an object', function () {

        var config = Config.getInstance();
        config.updateParams({
            'some.parameter': '1',
            'some.other.parameter': '2'
        });

        assert.equal(config.get('some.parameter'), '1');
        assert.equal(config.get('some.other.parameter'), '2');
    });

    it('sets parameters', function () {

        var config = Config.getInstance();
        config.updateParams({
            'some.param': 'yeah',
            'some.other.param': 'okay'
        });

        config.set('some.param', 'whatever');

        assert.equal(config.get('some.param'), 'whatever');
        assert.equal(config.get('some.other.param'), 'okay');
    });

    it('can return a list of dirty parameters', function () {

        var config = Config.getInstance();
        config.updateParams({
            'some.param': 'yeah',
            'some.other.param': 'okay'
        });

        config.set('some.param', 'whatever');
        var dirtyDirtyParams = config.getDirty();
        var dirtyDirtyKeys = Object.keys(dirtyDirtyParams);

        assert.equal(dirtyDirtyKeys.length, 1);
        assert.equal(dirtyDirtyParams['some.param'], 'whatever');
    });

    it('gets parameter sets by prefix', function () {

        var config = Config.getInstance();
        config.updateParams({
            'robocoin.this': 'this',
            'robocoin.that': 'that',
            'somethingElse.whatever': 'nope'
        });

        var robocoinParams = config.getParamsByPrefix('robocoin');
        var robocoinParamNames = Object.keys(robocoinParams);
        assert.equal(robocoinParamNames.length, 2);
        assert.equal(robocoinParamNames[0], 'this');
        assert.equal(robocoinParams.this, 'this');
        assert.equal(robocoinParamNames[1], 'that');
        assert.equal(robocoinParams.that, 'that');
    });
});
