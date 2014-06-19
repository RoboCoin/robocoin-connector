'use strict';

var Robocoin = require('../../apis/Robocoin');
var sinon = require('sinon');
var assert = require('assert');

describe('Robocoin', function () {

    it('includes a nonce, key and signature with every request', function (done) {

        var robocoin = Robocoin.getInstance();

        sinon.stub(robocoin, '_request')
            .callsArg(1);
        sinon.stub(robocoin, '_getNonce')
            .returns(1403062498);

        robocoin._post('/some-endpoint', { someParam: 'someValue' }, function (err, res) {

            var expectedOptions = {
                url: 'https://www.somefutureurl.net/api/0/some-endpoint',
                form: {
                    someParam: 'someValue',
                    nonce: 1403062498
                },
                method: 'POST',
                json: true,
                headers: {
                    'X-API-key': 'KmHKNmEXpWC4fzRnscic',
                    'X-API-signature': 'd1e02e8415032b9d95bf499827d9ad40fc7a3291870835e25cf2a09a78a4558b'
                }
            };

            assert(robocoin._request.calledWith(expectedOptions));

            done(err);
        });
    });
});
