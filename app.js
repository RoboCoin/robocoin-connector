var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var methodOverride = require('method-override');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
require('./logConfig');
var winston = require('winston');
var toobusy = require('toobusy');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var SessionMapper = require('./data_mappers/SessionMapper');
var csrf = require('csurf');
var helmet = require('helmet');
var passport = require('passport');
var UserMapper = require('./data_mappers/UserMapper');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');

var app = express();

app.set('trust proxy', true);
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// cookies
app.use(cookieParser('UaZpIsmkENYxnv1IH9BBtCDiyYuoGRS7TOTkIlKpbj5hbcYqqoYJh0r0CXARGuaa'));
// sessions
app.use(session({
    secret: 'xFQevBVehGuhYI594nKm0OJNAzZoJGzzsJo32Ey5o9rArr',
    store: new SessionMapper()
}));

// csrf protection
app.use(csrf());

// DoS mitigation
toobusy.maxLag(250);
app.use(function (req, res, next) {
    if (toobusy()) {
        res.send(503, 'The server is under heavy load and rejecting some requests.');
    } else {
        next();
    }
});

// HSTS
app.use(helmet.hsts({ maxAge: 7776000000 })); // ninety days

// logins
var userMapper = new UserMapper();
passport.use(new LocalStrategy(function (username, password, callback) {
    userMapper.findByLogin(username, password, function (err, user) {
        if (err) return callback(null, false, { message: err });
        return callback(null, user);
    });
}));
passport.serializeUser(function (user, done) { done(null, user.id); });
passport.deserializeUser(userMapper.findById);

var AUTOCONNECTOR_INTERVAL = 60000;

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
    app.locals.pretty = true;
    app.use(morgan({ format: 'dev'}));
}

// add the config to each request
app.use(function (req, res, next) {

    console.log('getting config');
    var ConfigMapper = require('./data_mappers/ConfigMapper');
    var configMapper = new ConfigMapper();
    configMapper.findAll(function (err, config) {
        console.log('got config', err);
        if (err) winston.error('Error getting config: ' + err);

        req.config = config;
        return next();
    });
});

// set a session default kiosk
app.use(function (req, res, next) {

    if (req.isAuthenticated()) {
        console.log('is authed');
        if (!req.session.kioskId) {
            console.log('no kiosk id set in session');
            var KioskMapper = require('./data_mappers/KioskMapper');
            var kioskMapper = new KioskMapper();
            kioskMapper.findOne(function (err, kiosk) {
                console.log('got kiosk:', err);
                req.session.kioskId = (kiosk) ? kiosk.id : null;
                return next();
            });
        } else { console.log('kiosk id set in session'); }
    } else { console.log('not authed'); }

    return next();
});

var auth = require('./routes/auth');
app.get('/login', auth.loginIndex);
app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
    function (req, res) { res.redirect('/'); }
);
app.get('/logout', auth.logout);

var index = require('./routes/index');
app.get('/transactions', ensureAuthenticated, index.transactions);
app.get('/account-info', ensureAuthenticated, index.accountInfo);
app.get('/buy-and-sell', ensureAuthenticated, index.buyAndSell);

var exchange = require('./routes/exchange');
app.get('/exchange/last-prices', ensureAuthenticated, exchange.lastPrices);
app.post('/exchange/buy', ensureAuthenticated, exchange.buy);
app.post('/exchange/sell', ensureAuthenticated, exchange.sell);
app.get('/exchange/latest-transactions', ensureAuthenticated, exchange.latestTransactions);
app.get('/exchange/account-info', ensureAuthenticated, exchange.accountInfo);

var robocoin = require('./routes/robocoin');
app.post('/robocoin/transactions', ensureAuthenticated, robocoin.getTransactions);
app.get('/robocoin/unprocessed-transactions', ensureAuthenticated, robocoin.getUnprocessedTransactions);
app.get('/robocoin/processed-transactions', ensureAuthenticated, robocoin.getProcessedTransactions);

var dashboard = require('./routes/dashboard');
app.get('/', ensureAuthenticated, dashboard.index);
app.get('/dashboard/summary', ensureAuthenticated, dashboard.summary);

var batchProcess = require('./routes/batch-process');
app.post('/batch-process', ensureAuthenticated, batchProcess.index);

var configuration = require('./routes/configuration');
app.get('/configuration', ensureAuthenticated, configuration.index);
app.post('/configuration/save-exchange', ensureAuthenticated, configuration.saveExchange);
app.post('/configuration/save-robocoin', ensureAuthenticated, configuration.saveRobocoin);
app.post('/configuration/save-currency-conversion', ensureAuthenticated, configuration.saveCurrencyConversion);

var kiosks = require('./routes/kiosks');
app.get('/kiosks', ensureAuthenticated, kiosks.index);
app.post('/kiosks/add', ensureAuthenticated, kiosks.addNewKiosk);
app.post('/kiosks/update', ensureAuthenticated, kiosks.update);

var server = http.createServer(app).listen(app.get('port'), function(){

    console.log('Express server listening on port ' + app.get('port'));
    console.log('App environment: ' + app.get('env'));

    var jobs = require('./periodicJobs');
    setInterval(function () {

        var randomNumber = (Math.random() * 10);

        // most of the time, run the autoconnector
        if (randomNumber > 1) {
            jobs.runAutoconnector();
        } else {
            // but sometimes, do the batch rollup
            jobs.batchProcess();
        }

    }, AUTOCONNECTOR_INTERVAL);
});

process.on('SIGINT', function () {
    winston.log('Got SIGINT, exiting...');
    server.close();
    toobusy.shutdown();
    process.exit();
});
process.on('SIGTERM', function () {
    winston.log('Got SIGTERM, exiting...');
    server.close();
    toobusy.shutdown();
    process.exit();
});

function ensureAuthenticated (req, res, next) {

    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login');
};
