'use strict';

var turnip = require('./lib'),
    settings = require('./config/settings.json');



var server;
server = turnip.create(settings);
server.start(function () {
    server.log('info', 'turnip listening');
    server.log('info', server.info);
});