'use strict';

var robocoin = require('../apis/Robocoin').getInstance();
robocoin.setMode('random');

var MONTHS_TO_LOAD = 6;
var TRANSACTIONS_PER_DAY = 50;

// transactions per month, divided by 1.5, which is average number of random transactions generated
var loopIterations = Math.round((MONTHS_TO_LOAD * TRANSACTIONS_PER_DAY * 30) / 1.5);


