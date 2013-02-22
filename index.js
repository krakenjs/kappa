'use strict';

var Hapi = require('hapi');


process.on('uncaughtException', function (err) {
    Hapi.Log.event('error', err.message);
    Hapi.Log.event('error', err.stack);
    process.exit(1);
});


var argv = require('commander')
    .version('0.0.1')
    .usage('[options] <registry ...>')
    .option('-p, --port [port]', 'Port to listen on (default 8000)', parseInt, 8000)
    .parse(process.argv);

if (!argv.args || !argv.args.length) {
    Hapi.Log.event('error', 'npm-delegate: Please specify the URL (including port) for at least one NPM registry.');
    Hapi.Log.event('error', 'npm-delegate: try \'npm-delegate --help\' for more information');
    process.exit(1);
}


var server = new Hapi.Server(argv.port);
server.plugin().require('./lib/delegate', { paths: argv.args }, function () {
    server.start();
});





