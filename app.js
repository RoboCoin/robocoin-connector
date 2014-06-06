var express = require('express');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
    app.locals.pretty = true;
}

var robocoin = require('./apis/Robocoin')('', '');

var config = require('../connectorConfig');
var bitstamp = require('./apis/Bitstamp')(config.bitstamp);

var index = require('./routes/index')(robocoin, bitstamp);
app.get('/', index.transactions);
app.get('/account-info', index.accountInfo);
app.get('/buy-and-sell', index.buyAndSell);

var exchange = require('./routes/exchange')(robocoin, bitstamp);
app.get('/exchange/last-price', exchange.lastPrice);
app.post('/exchange/buy', exchange.buy);

var robocoin = require('./routes/robocoin')(robocoin);
app.get('/robocoin/transactions', robocoin.getTransactions);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
