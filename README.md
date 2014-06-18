# robocoin-connector

This connector is an example of the code you'll need to write to connect the Robocoin public API to an exchange's API.

## How it works

On a buy, the user puts fiat into the kiosk. Then the bank transfers BTC from the operator's account to the user's
account. We publish this transaction in the public API. The connector sees that the operator account sent money, then
executes a buy on the exchange for the amount sent, then withdraws that amount to the operator's account, replenishing
the sold BTC.

On a sell, the user sends an amount of BTC from their account to the operator's account. The kiosk dispenses fiat.
Robocoin automatically sends this BTC amount from the operator's account to their exchange. We also monitor how many
confirmations are on that transaction and this info is in the public API. When the connector sees enough confirmations,
it executes a sell for that amount on the exchange.

## Configuration

You'll need to put a configuration file one directory above the application directory. You must name this file
connectorConfig.json and it should look something like this:

    {
        "bitstamp": {
            "baseUrl": "https://www.bitstamp.net/api",
            "clientId": "xxxx",
            "apiKey": "xxxx",
            "secret": "xxxx"
        },
        "db": {
            "host": "localhost",
            "user": "root",
            "database": "robocoin_connector"
        },
        "robocoin": {
            "baseUrl": "https://www.somefutureurl.net/api/0",
            "key": "xxxx",
            "secret": "xxxx"
        },
        "exchangeClass": "Bitstamp"
    }

### Test mode

To run the connector with randomly-generated test data, add a property called "testMode" with a value of "random" to
the "robocoin" section of the config, in the same object as baseUrl, key and secret.

To run the connector with a mock version of the Bitstamp API, which simply echoes calls instead of sending HTTP
requests, change the "exchangeClass" parameter to a value of "MockBitstamp".

## Installation

Requirements:

* NodeJs + npm
* MySQL
* mocha (for tests)

        npm install mocha -g

Run scripts/database.sql:

        mysql -u root < database.sql

In the directory containing package.json, run:

        npm install

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
