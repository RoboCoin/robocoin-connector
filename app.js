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
var cookieParser = require('cookie-parser');
var session = require('express-session');
var SessionMapper = require('./data_mappers/SessionMapper');
var csrf = require('csurf');
var helmet = require('helmet');
var passport = require('passport');
var UserMapper = require('./data_mappers/UserMapper');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var compression = require('compression');
var expressEnforcesSsl = require('express-enforces-ssl');

var app = express();

app.use(compression());
app.enable('trust proxy');
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(require('express-domain-middleware'));
app.use(errorHandler());

var cookie = {
    httpOnly: true
};
// development only
if ('development' == app.get('env')) {
    console.log('not forcing SSL');
    app.locals.pretty = true;
    app.use(morgan('dev'));
    cookie.secure = false;
} else {
    console.log('forcing SSL');
    app.use(morgan('combined'));
    cookie.secure = true;
    app.use(expressEnforcesSsl());
}

// cookies
app.use(cookieParser('UaZpIsmkENYxnv1IH9BBtCDiyYuoGRS7TOTkIlKpbj5hbcYqqoYJh0r0CXARGuaa'));
// sessions
app.use(session({
    secret: 'xFQevBVehGuhYI594nKm0OJNAzZoJGzzsJo32Ey5o9rArr',
    store: new SessionMapper(),
    resave: true,
    saveUninitialized: true,
    cookie: cookie
}));

// csrf protection
app.use(csrf());

// HSTS
app.use(helmet.hsts({
    maxAge: 7776000000,
    includeSubdomains: true,
    force: true
})); // ninety days

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

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride());
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// add the config to each request
var ConfigMapper = require('./data_mappers/ConfigMapper');
var configMapper = new ConfigMapper();
app.use(function (req, res, next) {

    configMapper.findAll(function (err, config) {

        if (err) winston.error('Error getting config: ' + err);

        req.config = config;
        return next();
    });
});

// set a session default kiosk
app.use(function (req, res, next) {
    if (req.isAuthenticated()) {
        if (!req.session.kioskId) {
            var KioskMapper = require('./data_mappers/KioskMapper');
            var kioskMapper = new KioskMapper();
            kioskMapper.findOne(function (err, kiosk) {
                req.session.kioskId = (kiosk) ? kiosk.id : null;
                return next();
            });
        } else {
            return next();
        }
    } else {
        return next();
    }
});

// send to setup page if not already set up
app.use(function (req, res, next) {
    var pingUrl = req.config.get(null, 'PING_URL');
    var path = req.path;
    winston.warn('pingUrl: ' + pingUrl + ' and path: ' + path);
    if ((!pingUrl && path == '/setup') || (pingUrl && path != '/setup')) {

        return next();

    } else {

        return res.send('Invalid URL');
    }
});

var setup = require('./routes/setup');
app.get('/setup', setup.get);
app.post('/setup', setup.set);

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
app.get('/exchange/user-transactions', ensureAuthenticated, exchange.userTransactions);

var robocoin = require('./routes/robocoin');
app.post('/robocoin/transactions', ensureAuthenticated, robocoin.getTransactions);
app.get('/robocoin/unprocessed-transactions', ensureAuthenticated, robocoin.getUnprocessedTransactions);
app.get('/robocoin/processed-transactions', ensureAuthenticated, robocoin.getProcessedTransactions);
app.get('/robocoin/transaction-hash', ensureAuthenticated, robocoin.getTransactionHash);
app.post('/robocoin/import-transactions', ensureAuthenticated, robocoin.importTransactions);

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
app.post('/configuration/toggle-autoconnector', ensureAuthenticated, configuration.toggleAutoconnector);

var logs = require('./routes/logs');
app.get('/logs', ensureAuthenticated, logs.index);

app.use(function (err, req, res, next) {

    switch (err.code) {
        case 'EBADCSRFTOKEN':
            res.status(403);
            return res.send('Session expired or form tampered with');
            break;

        case 'EXCHANGE_NOT_CONFIGURED':
            return res.status(500).send(err.message);
            break;

        default:
            winston.error(err);
            return res.status(500).send('Woops! We had an unexpected problem.');
    }
});

var server = http.createServer(app).listen(app.get('port'), function() {

    console.log('Express server listening on port ' + app.get('port'));
    console.log('App environment: ' + app.get('env'));

    var jobs = require('./periodicJobs');
    configMapper.findAll(function (err, config) {

        if (err) winston.error('Error getting config: ' + err);

        if (config && config.get(null, 'autoconnectorEnabled') == 1) {
            jobs.startInterval();
        }
    });

    require('./archiveLogs');
    //require('./noIdle');
    require('./deleteOldSessions');
});

process.on('SIGINT', function () {
    winston.log('Got SIGINT, exiting...');
    server.close();
    process.exit();
});
process.on('SIGTERM', function () {
    winston.log('Got SIGTERM, exiting...');
    server.close();
    process.exit();
});

function ensureAuthenticated (req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
};
