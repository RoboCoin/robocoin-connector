# robocoin-connector

This connector is an example of the code you'll need to write to connect the Robocoin public API to an exchange's API.
Robocoin will not run this code on its platform. We suggest operators use a platform such as Heroku to run this code.
As the development of the connector progresses, leading up to release, we'll make owning this code as simple as
possible for operators.

## How it works

On a buy, the user puts fiat into the kiosk. Then the bank transfers BTC from the operator's account to the user's
account. We publish this transaction in the public API. The connector sees that the operator account sent BTC, then
executes a buy on the exchange for the amount sent, then withdraws that amount to the operator's account, replenishing
the sold BTC.

On a sell, the user sends an amount of BTC from their account to the operator's account. The kiosk dispenses fiat.
Robocoin automatically sends this BTC amount from the operator's account to their exchange. We also monitor how many
confirmations are on that transaction and this info is in the public API. When the connector sees enough confirmations,
it executes a sell for that amount on the exchange.

### Test mode

To run the connector with randomly-generated Robocoin test data, from the Configuration page, specify your API keys and
check the "Test Mode" box.

To run the connector with a mock version of the Bitstamp API, which simply echoes calls instead of sending HTTP
requests, from the Configuration page, specify your API keys and check the "Test Mode" box.

## Installation

Requirements:

* NodeJs + npm
* PostgreSQL
* mocha (for tests)

        npm install mocha -g

* grunt (to run the grunt file)

        npm install -g grunt-cli

* supervisor (to ease developement)

        npm install supervisor -g

* forever

        npm install forever -g

Run scripts/database.sql:

        psql -U postgres robocoin_connector < database.sql

In production, set the NODE_ENV environment variable to "production".

Set the ENCRYPTION_KEY environment variable to a secret, preferably created with scripts/getSecret

In the directory containing package.json, run:

        npm install

Run scripts/setConfigParam.js with

* exchangeClass MockBitstamp
* bitstamp.baseUrl https://www.bitstamp.net/api
* robocoin.baseUrl https://www.somefutureurl.net/api/0
* robocoin.testMode 1

When everything's installed, run "supervisor app.js" in a developement environment, or "npm start" in production.

## Extending

To write an exchange class for a new exchange, write a class that implements each of the public (not beginning with an
underscore) methods in the Bitstamp class. Also implement the same module interface, with the getInstance method. The
clearInstance method is useful for testing. Put this new class file in apis/exchanges and change the exchangeClass
config parameter to point to the new class file. Test files can go in the respective directory under the "test"
directory.

## Grunt

To run unit and integration tests:

        grunt mochacli

To run JsHint:

        grunt jshint

There's also a watcher task that runs the tests and JsHint whenever a file changes:

        grunt watch

## Demo

There's a running demo at <https://still-sierra-5744.herokuapp.com>. The username is "bobo" and the password is
"hu3SGRxU3UnWAMtXTFw".
