'use strict';

var winston = require('winston');
var PostgresLogger = require('./data_mappers/PostgresLogger');

winston.add(PostgresLogger);