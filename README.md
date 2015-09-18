# robocoin-connector

The connector gives operators the ability to programatically manage their account's float with a supported liquidity 
engine via the Romit Connector API.  The connector also provides a simple interface for integrators looking to add 
their own liquidity engine.

## How it works

From the perspective of the connector, sending money is similar to buying Bitcoin and receiving money is similar to 
selling Bitcoin. 

On a buy, the user puts fiat into the kiosk. Then the bank transfers BTC from the operator's account to the user's
account. We publish this transaction in an API endpoint. The connector sees that the operator account sent BTC, then
executes a buy on the exchange for the amount sent, then withdraws that amount to the operator's account, replenishing
the sold BTC.

On a sell, the user sends an amount of BTC from their account to the operator's account. The kiosk dispenses fiat.
Romit automatically sends this BTC amount from the operator's account to their exchange. We also monitor how many
confirmations are on that transaction. When the connector sees enough confirmations, it executes a sell for that amount 
on the exchange.

## Get started

1. If you don't already have an operator wallet, create one by clicking Add Wallet, give it a name, select Operator 
Wallet and click Create Wallet. Then click the Pencil icon in the top right of your operator wallet. Under API, click 
New Key, give the key a name, select Connector and click Generate Key. Temporarily note the key and secret, since we'll 
need these to set up your connector. 
2. Your operator wallet will be receiving funds withdrawn from your exchange account, so you'll need a deposit 
address attached to your operator wallet. At wallet.romit.io, navigate to Receive. If you don't already have an address 
with your operator wallet's name listed under Wallet, click Add New Address. Select your operator wallet, give the new 
address a label and click Add Address. 
3. Your operator wallet will be sending funds to your exchange account. Navigate to your kiosk. Under the 
Connector tab, set your exchange account's deposit address as the Forwarding Address and Save it. 
4. Click on your wallet and, from the Connector tab, click Set Up a Connector. This will direct you to Heroku. 
5. If you have a Heroku account, sign in. If not, sign up. 
6. When you're redirected back to Romit, you'll see "Creating your connector..." When that's complete, you'll be 
directed to your new Connector instance.
7. Enter your email address and Romit API keys, click Save and you're ready to go. Note the generated password and URL 
along with the email address you used. This email and password is how you'll log into this URL.
8. Click the logo in the header and you'll be prompted to log in. You can now configure your exchange API keys.
9. If you have no existing transactions on the Romit platform, skip to step 10. If you have existing transactions on the 
Romit platform that you don't want the connector to process, you must select a date from which to start processing 
transactions. Navigate to the Transactions page and, under Import Romit Transactions, select a date in UTC to begin 
processing transactions through the connector and click Import. If the list of Unprocessed Transactions looks correct, 
you can proceed.
10. When your exchange account is funded, you can enable the Autoconnect feature. 

## Test mode

To run the connector with a mock version of the Bitstamp API, which simply echoes calls instead of sending HTTP
requests, from the Configuration page, specify to use "Mock Bitstamp".

## Installation (for developers)

Requirements:

* NodeJs + npm
* PostgreSQL server, client and contrib
* mocha (for tests)

        npm install mocha -g

* grunt (to run the grunt file)

        npm install -g grunt-cli

* supervisor (to ease developement)

        npm install supervisor -g

* forever

        npm install forever -g

In your development environment, add your username to the postgres group. This might look something like

        sudo usermod -a -G postgres yourusername

You'll need to add your user to postgres and allow it to log in:

        createuser -l -P -s youruser (from OS CLI)
        create database robocoin_connector;
        grant all on database robocoin_connector to youruser;

Modify the line in pg_hba.conf to be:

        local   all             all                                     password

Run scripts/database.sql:

        psql robocoin_connector < database.sql

In production, set the NODE_ENV environment variable to "production".

Set the ENCRYPTION_KEY environment variable to a secret, preferably created with "openssl rand -hex 8"

Set the DATABASE_URL environment variable to something like postgres://yourusername:somepassword@localhost:5432/robocoin_connector

In the directory containing package.json, run:

        npm install

In your developement environment, add a user. Note the automatically-generated password:

        node scripts/addUser.js yourusername

Run "node scripts/setConfigParam.js". When prompted, leave the Kiosk ID blank, parameter name is robocoin.key and the value is your Romit key.

Run "node scripts/setConfigParam.js". When prompted, leave the Kiosk ID blank, parameter name is robocoin.secret and the value is your Romit secret.

Run "node scripts/setConfigParam.js". When prompted, leave the Kiosk ID blank, parameter name is robocoin.baseUrl and the value is "https://api.romit.io/v0/connector".

When everything's installed, run "supervisor app.js" in a developement environment, or "forever app.js" in production.

Open the connector dashboard in a browser and go to the Configuration page. Configure each kiosk.

## Extending

To write an exchange class for a new exchange, write a class that implements each of the methods described below. Also
implement the same module interface as e.g. the Bitstamp class, with the getInstance method. The clearInstance method
is useful for testing. Put this new class file in apis/exchanges. Test files can go in the respective directory under
the "test" directory.

The class constructor must accept a config object as its only parameter. It must use a reference to it as a member
parameter. The reason for using a reference is so that the class can immediately use updates to the configuration
without requiring a server restart.

The methods you must implement in this class are:

        getBalance(callback) : callback(err, { btc_available, fiat_available, fee })

        getDepositAddress(callback) : callback(err, { address })

        buy(amount, price, callback) : callback(err, { datetime, id, type, fiat, xbt, fee, order_id })

        sell(amount, price, callback) : callback(err, { datetime, id, type, fiat, xbt, fee, order_id })

        withdraw(amount, address, callback) : callback(err)

        userTransactions(callback) : callback(err, [{ datetime, type, fiat, xbt, fee, order_id }])

        getPrices(callback) : callback(err, { buyPrice, sellPrice })

        getMinimumOrders(callback) : callback(err, { minimumBuy, minimumSell })
        
        getRequiredConfirmations() : return int

In order for the exchange to be configurable from the Configuration page, you'll need to place a JSON file with the
same name and in the same directory as the exchange class. This file must contain a valid JSON object, with a property
for the exchange's label as displayed in the dashboard, an object for non-configurable parameters and an object for
configurable parameters. See examples in the apis/exchanges directory.

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


