'use strict';

var Config = require('../../lib/Config');
var assert = require('assert');

describe('Config', function () {

    it('initializes from an object', function () {

        var config = Config.getInstance();
        config.updateParams([
            {
                'kiosk_id': '1',
                'param_name': 'some.parameter',
                'param_value': '1'
            },
            {
                'kiosk_id': '1',
                'param_name': 'some.other.parameter',
                'param_value': '2'
            }
        ]);

        var params = config.getAllForKiosk('1');

        assert.equal(params['some.parameter'], '1');
        assert.equal(config.get('1', 'some.other.parameter'), '2');
    });

    it('sets parameters', function () {

        var config = Config.getInstance();
        config.updateParams([
            {
                'kiosk_id': '1',
                'param_name': 'some.other.param',
                'param_value': 'okay'
            },
            {
                'kiosk_id': '1',
                'param_name': 'some.param',
                'param_value': 'yeah'
            }
        ]);

        config.set('1', 'some.param', 'whatever');

        assert.equal(config.get('1', 'some.param'), 'whatever');
        assert.equal(config.get('1', 'some.other.param'), 'okay');
    });

    it('can return a list of dirty parameters', function () {

        var config = Config.getInstance();
        config.updateParams([
            {
                kiosk_id: '1',
                param_name: 'some.param',
                param_value: 'yeah'
            },
            {
                kiosk_id: '1',
                param_name: 'some.other.param',
                param_value: 'okay'
            }
        ]);

        config.set('1', 'some.param', 'whatever');
        var dirtyDirtyParams = config.getDirtyForKiosk('1');
        var dirtyDirtyKeys = Object.keys(dirtyDirtyParams);

        assert.equal(dirtyDirtyKeys.length, 1);
        assert.equal(dirtyDirtyParams['some.param'], 'whatever');
    });
});
