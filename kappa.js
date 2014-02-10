#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    Hapi = require('hapi'),
    argv = require('minimist')(process.argv.slice(2)),
    shortstop = require('shortstop'),
    handlers = require('shortstop-handlers');


function bomb(fn) {
    return function setUsUpTheBomb(err) {
        if (err) {
            throw err;
        }
        return fn.apply(null, arguments);
    };
}



var basedir, resolver, manifest, composer;

basedir = argv.b || argv.basedir;
basedir = basedir ? path.resolve(basedir) : process.cwd();

resolver = shortstop.create();
resolver.use('path', handlers.path(basedir));
resolver.use('file', handlers.file(basedir));
resolver.use('env',  handlers.env(basedir));

manifest = require(path.resolve(basedir, argv.c || argv.config));
manifest = resolver.resolve(manifest);

composer = new Hapi.Composer(manifest);
composer.compose(bomb(function (err) {
    composer.start(bomb(function (err) {
        // This makes the baby Jesus weep.
        composer._manifest[0].servers.forEach(function (server) {
            console.log('Kappa listening on %s:%d', (server.host || ''), server.port);
        });
    }));
}));
