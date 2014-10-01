'use strict';

var Robocoin = require('../../apis/Robocoin');
var sinon = require('sinon');
var assert = require('assert');
var Config = require('../../lib/Config');

describe('Robocoin', function () {

    it('includes a key and signature with every request', function (done) {

        var config = Config.getInstance();
        config.updateParams([
            {
                kiosk_id: null,
                param_name: 'robocoin.testMode',
                param_value: '0'
            },
            {
                kiosk_id: null,
                param_name: 'robocoin.secret',
                param_value: 'gpNrX0HZii0UK4MNp2tm'
            },
            {
                kiosk_id: null,
                param_name: 'robocoin.baseUrl',
                param_value: 'https://www.somefutureurl.net/api/0'
            },
            {
                kiosk_id: null,
                param_name: 'robocoin.key',
                param_value: 'KmHKNmEXpWC4fzRnscic'
            }
        ]);
        Robocoin.clearInstance();
        var robocoin = Robocoin.getInstance(config);

        sinon.stub(robocoin, '_request')
            .callsArgWith(1, null, { statusCode: 200 });
        sinon.stub(robocoin, '_getTimestamp')
            .returns(1409106914);

        robocoin._post('/some-endpoint', { someParam: 'someValue' }, function (err, res) {

            var expectedOptions = {
                url: 'https://www.somefutureurl.net/api/0/some-endpoint',
                form: {
                    someParam: 'someValue'
                },
                method: 'POST',
                json: true,
                headers: {
                    'X-API-signature': 'e13d792f81f672474a9db1bf95491be17fcc688d4f0257bc40b50bcd3d1f5857',
                    'X-Request-Date': 1409106914,
                    'Authorization': 'Credential=KmHKNmEXpWC4fzRnscic, SignedHeaders=host;x-request-date, Signature=e13d792f81f672474a9db1bf95491be17fcc688d4f0257bc40b50bcd3d1f5857'
                }
            };

            assert(robocoin._request.calledWith(expectedOptions));

            done(err);
        });
    });
});
