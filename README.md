# robocoin-connector

This connector is an example of the code you'll need to write to connect the Robocoin public API to an exchange's API.

## Configuration

You'll need to put a configuration file one directory above the application directory. This configuration file should
look something like this:

    {
        "bitstamp": {
            "baseUrl": "https://www.bitstamp.net/api",
            "clientId": "12345",
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

In the directory containing package.json, run:

        npm install