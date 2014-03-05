'use strict';

var test = require('tape');
var Hapi = require('hapi');
var kappa = require('../');
var stats = require('../lib/stats');


function wait(duration, fn) {
    return function () {
        var args;
        args = Array.prototype.slice.call(arguments);
        args.unshift(null);
        setTimeout(Function.prototype.bind.apply(fn, args), duration);
    };
}

// Prime some samples
stats.sample('bar', 10);
stats.sample('baz', function () {
    return 10;
});

test('stats', wait(6000, function (t) {

    t.test('handler', function (t) {
        stats.handler(null, function (stats) {
            t.equal(typeof stats, 'object');
            t.equal(typeof stats.counters, 'object');
            t.equal(typeof stats.hostname, 'string');
            t.equal(typeof stats.loadavg,  'object');
            t.equal(typeof stats.totalmem, 'number');
            t.end();
        });
    });

    t.test('increment', function (t) {
        stats.increment('foo');
        stats.handler(null, function (stats) {
            t.equal(typeof stats, 'object');
            t.equal(typeof stats.counters, 'object');
            t.equal(stats.counters.foo, 1);
            t.end();
        });
    });

    t.test('decrement', function (t) {
        stats.decrement('foo');
        stats.handler(null, function (stats) {
            t.equal(typeof stats, 'object');
            t.equal(typeof stats.counters, 'object');
            t.equal(stats.counters.foo, 0);
            t.end();
        });
    });

    t.test('sample', function (t) {
        // Setup prior to test... see above.
        stats.handler(null, function (stats) {
            t.equal(typeof stats, 'object');
            t.equal(typeof stats.samples, 'object');
            t.equal(stats.samples.bar, 10);
            t.equal(stats.samples.baz, 10);
            t.end();
        });
    });

}));
