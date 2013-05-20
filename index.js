'use strict';

var turnip = require('./lib'),
    settings = require('./config/settings.json');



var server, levels;
server = turnip.create(settings);
server.start(function () {
    console.log('listening');
});