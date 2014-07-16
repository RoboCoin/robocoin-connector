'use strict';

var winston = require('winston');
var PostgresLogger = require('./data_mappers/PostgresLogger');

winston.add(winston.transports.File, { filename: './its.log' });
winston.add(PostgresLogger);