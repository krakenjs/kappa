#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var Hapi = require('hapi');
var argv = require('minimist')(process.argv.slice(2));
var shortstop = require('shortstop');
var handlers = require('shortstop-handlers');


function bomb(fn) {
    return function setUsUpTheBomb(err) {
        if (err) {
            throw err;
        }
        return fn.apply(null, arguments);
    };
}



var basedir, resolver, manifest;

basedir = argv.b || argv.basedir;
basedir = basedir ? path.resolve(basedir) : process.cwd();

resolver = shortstop.create();
resolver.use('path', handlers.path(basedir));
resolver.use('file', handlers.file(basedir));
resolver.use('env',  handlers.env(basedir));
resolver.use('require', handlers.require(basedir));

manifest = require(path.resolve(basedir, argv.c || argv.config));
manifest = resolver.resolve(manifest, bomb(function (err, manifest) {

    Hapi.Pack.compose(manifest, {}, bomb(function (err, pack) {

        pack.start(bomb(function (err) {
            if (err) {
                throw err;
            }
            console.log('Server started.');
        }));

    }));

}));

