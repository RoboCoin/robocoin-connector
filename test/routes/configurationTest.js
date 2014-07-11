'use strict';

var configuration = require('../../routes/configuration');
var UserMapper = require('../../data_mappers/UserMapper');
var userMapper = new UserMapper();
var ConfigMapper = require('../../data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
var sinon = require('sinon');
var assert = require('assert');

describe('configuration', function () {

    describe('currency conversion', function () {

        beforeEach(function () {

            configuration._userMapper = null;
            configMapper._configMapper = null;
        });

        afterEach(function () {

            userMapper.findByLogin.restore();
        });

        var _getRequest = function () {

            return {
                body: {
                    username: 'whatever',
                    password: 'doesntmatter',
                    kioskCurrency: 'CAD',
                    conversionRate: 1.125
                }
            };
        };

        it('saves data', function (done) {

            sinon.stub(userMapper, 'findByLogin').callsArg(2);
            configuration._userMapper = userMapper;

            sinon.stub(configMapper, 'save').callsArg(1);
            configuration._configMapper = configMapper;

            var req = _getRequest();
            var res = {
                send: function (data) {

                    assert.equal(data, 'Currency conversion saved');
                    assert(userMapper.findByLogin.calledWith('whatever', 'doesntmatter'));
                    assert(configMapper.save.called);

                    configMapper.save.restore();

                    done();
                }
            };

            configuration.saveCurrencyConversion(req, res);
        });

        it('shows error when invalid login', function (done) {

            sinon.stub(userMapper, 'findByLogin').callsArgWith(2, 'Woops!');
            configuration._userMapper = userMapper;

            var req = _getRequest();
            var res = {
                send: function (data, status) {

                    assert.equal(status, 400);
                    assert.equal('Woops!', data);
                    assert(configuration._userMapper.findByLogin.called);
                    done();
                }
            };

            configuration.saveCurrencyConversion(req, res);
        });
    });
});
