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
                    'X-API-key': 'Qdell85I0JglZuGPz5md',
                    'X-API-signature': '8407b69b3936f9c7944cd4d66b11f0e52d63810c9a1d080cd2113e72676f6ded'
                }
            };

            assert(robocoin._request.calledWith(expectedOptions));

            done(err);
        });
    });
});
