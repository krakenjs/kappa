#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    Hapi = require('hapi'),
    argv = require('optimist').argv,
    shortstop = require('shortstop');


function createPathResolver(basedir) {
    return function resolvePath(value) {
        if (path.resolve(value) === value) {
            // Is absolute path already
            return value;
        }

        return path.join(basedir, value);
    };
}

function createFileResolver(basedir) {
    var resolve = createPathResolver(basedir);
    return function resolveFile(value) {
        return fs.readFileSync(resolve(value));
    };
}


function createEnvResolver() {
    return function (value) {
        var env, num;
        env = process.env[value];

        // Slight kludge to handle Number types.
        // I know, I know... it won't handle 1.7976931348623157e+308
        if (env && env.match(/\d*/)) {
            num = parseInt(env, 10);
            env = isNaN(num) ? env : num;
        }

        return env;
    };
}

function bomb(fn) {
    var slice = Function.prototype.call.bind(Array.prototype.slice);
    return function setUsUpTheBomb(err) {
        if (err) {
            throw err;
        }
        return fn.apply(null, slice(arguments, 1));
    };
}



var basedir, resolver, manifest, composer;

basedir = argv.b || argv.basedir;
basedir = basedir ? path.resolve(basedir) : process.cwd();

resolver = shortstop.create();
resolver.use('path', createPathResolver(basedir));
resolver.use('file', createFileResolver(basedir));
resolver.use('env',  createEnvResolver(basedir));

manifest = require(path.resolve(basedir, argv.c || argv.config));
manifest = resolver.resolve(manifest);

composer = new Hapi.Composer(manifest);
composer.compose(bomb(function () {
    composer.start(bomb(function () {
        // This makes the baby Jesus weep.
        composer._manifest[0].servers.forEach(function (server) {
            console.log('Kappa listening on %s:%d', (server.host || ''), server.port);
        });
    }));
}));
