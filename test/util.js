'use strict';

var url = require('url');
var test = require('tape');
var util = require('../lib/util');


test('isValidHeader', function (t) {
    t.plan(4);
    t.ok(util.isValidHeader('accepts'));
    t.ok(util.isValidHeader('content-type'));
    t.notOk(util.isValidHeader('content-length'));
    t.notOk(util.isValidHeader('date'));
    t.end();
});


test('namespace', function (t) {
    var obj;

    t.plan(9);

    obj = {};
    t.strictEqual(util.namespace(obj), obj);

    util.namespace(obj);
    t.equal(typeof obj, 'object');
    t.equal(Object.keys(obj).length, 0);

    util.namespace(obj, 'foo');
    t.equal(typeof obj.foo, 'object');
    t.equal(Object.keys(obj).length, 1);

    util.namespace(obj, 'foo', 'bar');
    t.equal(typeof obj.foo.bar, 'object');
    t.equal(Object.keys(obj).length, 1);

    util.namespace(obj, 5, undefined, 'baz');
    t.equal(typeof obj['5']['undefined'].baz, 'object');
    t.equal(Object.keys(obj).length, 2);

    t.end();
});


test('ns', function (t) {
    var ns, obj;

    t.plan(4);

    obj = {};
    function assign(obj, name) {
        obj[name] = name;
    }

    ns = util.ns(obj, assign);
    ns('foo');
    t.equal(obj.foo, 'foo');

    ns('bar:baz:bam');
    t.equal(typeof obj.bar, 'object');
    t.equal(typeof obj.bar.baz, 'object');
    t.equal(obj.bar.baz.bam, 'bam');

    t.end();
});


test('init', function (t) {
    var obj, init;

    t.plan(11);

    obj = {};
    function test(obj, prop) {
        t.ok(obj.hasOwnProperty(prop));
    }

    obj.foo = {};
    init = util.init(obj, test);

    init('foo');
    t.equal(typeof obj.foo, 'object');

    init('foo:bar');
    t.equal(typeof obj.foo, 'object');
    t.equal(typeof obj.foo.bar, 'number');

    init('foo:bar:baz');
    t.equal(typeof obj.foo.bar, 'object');
    t.equal(typeof obj.foo.bar.baz, 'number');

    init('foo:bar:baz:bam');
    t.equal(typeof obj.foo.bar.baz, 'object');
    t.equal(typeof obj.foo.bar.baz.bam, 'number');

    t.end();
});


test('maybe', function (t) {
    var obj, maybe;

    t.plan(2);

    obj = { foo: { bar: {} } };
    function assign(obj, name) {
        t.ok(obj);
    }

    maybe = util.maybe(obj, assign);
    maybe('foo');
    maybe('foo:bar');
    maybe('foo:bar:baz');
    maybe('foo:bar:baz:bam');
    t.end();
});


test('map', function (t) {
    var src, dest;

    t.plan(4);

    src = {
        foo: 'foo',
        bar: true,
        baz: {
            bam: 1
        }
    };

    function assign(value) {
        return value + ' ' + value;
    }

    dest = util.map(src, assign);
    t.notEqual(dest, src);
    t.equal(dest.foo, 'foo foo');
    t.equal(dest.bar, 'true true');
    t.equal(dest.baz.bam, '1 1');
    t.end();
});


test('sum', function (t) {
    var obj;

    t.plan(5);

    obj = {
        foo: 'foo',
        bar: [0, 1],
        baz: 'baz'
    };

    t.equal(util.sum(obj), 8);

    t.throws(function () {
        util.sum('test');
    });

    t.throws(function () {
        util.sum(true);
    });

    t.throws(function () {
        util.sum(0);
    });

    t.throws(function () {
        util.sum(1);
    });

    t.end();
});


test('tryParse', function (t) {
    var obj;

    t.plan(3);

    obj = util.tryParse('{}');
    t.equal(typeof obj, 'object');

    obj = util.tryParse('');
    t.ok(obj instanceof Error);

    obj = util.tryParse('{,}');
    t.ok(obj instanceof Error);

    t.end();
});


test('transform', function (t) {
    var obj;

    t.plan(6);

    obj = {
        foo: 'foo',
        bar: {
            foo: 'foo',
            baz: {
                foo: 'foo'
            }
        },
        baz: 5
    };


    util.transform(obj, 'foo', function (value) {
        return value + ' ' + value;
    });

    t.equal(obj.foo, 'foo foo');
    t.equal(typeof obj.bar, 'object');
    t.equal(obj.bar.foo, 'foo foo');
    t.equal(typeof obj.bar.baz, 'object');
    t.equal(obj.bar.baz.foo, 'foo foo');
    t.equal(obj.baz, 5);
    t.end();
});


test('rewriter', function (t) {
    var req, host, registry, rewrite, actual;

    t.plan(9);

    req = {
        headers: {},
        info: url.parse('http://npm.paypal.com/'),
        server: {
            info: url.parse('http://localhost:8000')
        }
    };

    host = util.hostInfo(req);
    registry = url.parse('http://localhost:5984/registry/_design/app/_rewrite/');
    rewrite = util.rewriter(host, registry);

    actual = rewrite();
    t.notOk(actual);

    actual = rewrite('http://localhost:5984/foo');
    t.equal(actual, 'http://npm.paypal.com/foo');

    actual = rewrite('http://localhost:5984');
    t.equal(actual, 'http://npm.paypal.com/');

    actual = rewrite('http://localhost:5984/');
    t.equal(actual, 'http://npm.paypal.com/');

    actual = rewrite('http://localhost:5984/registry/_design/app/_rewrite/kappa/-/kappa-0.0.0.tgz');
    t.equal(actual, 'http://npm.paypal.com/kappa/-/kappa-0.0.0.tgz');


    host = util.hostInfo(req);
    registry = url.parse('http://registry.npmjs.org');
    rewrite = util.rewriter(host, registry);

    actual = rewrite('http://registry.npmjs.org/foo');
    t.equal(actual, 'http://npm.paypal.com/foo');

    actual = rewrite('http://registry.npmjs.org');
    t.equal(actual, 'http://npm.paypal.com/');

    actual = rewrite('http://registry.npmjs.org/');
    t.equal(actual, 'http://npm.paypal.com/');

    actual = rewrite('http://registry.npmjs.org/kappa/-/kappa-0.0.0.tgz');
    t.equal(actual, 'http://npm.paypal.com/kappa/-/kappa-0.0.0.tgz');


    t.end();
});


test('hostInfo', function (t) {
    var req, actual;

    t.plan(8);

    req = {
        headers: {},
        info: url.parse('https://npm.paypal.com'),
        server: {
            info: url.parse('http://localhost:8000')
        }
    };

    actual = util.hostInfo(req);
    t.equal(typeof actual, 'object');
    t.equal(actual.protocol, 'http:');
    t.equal(actual.hostname, 'npm.paypal.com');
    t.equal(actual.port, null);

    req.headers['x-forwarded-proto'] = 'https';

    actual = util.hostInfo(req);
    t.equal(typeof actual, 'object');
    t.equal(actual.protocol, 'https:');
    t.equal(actual.hostname, 'npm.paypal.com');
    t.equal(actual.port, null);

    t.end();
});


test('suffix', function (t) {
    t.plan(5);

    t.equal(util.suffix('foo', 'o'), 'foo');
    t.equal(util.suffix('foo', 'oo'), 'foo');
    t.equal(util.suffix('foo', 'bar'), 'foobar');
    t.equal(util.suffix(undefined, 'o'), undefined);
    t.equal(util.suffix('foo'), 'foo');

    t.end();
});
