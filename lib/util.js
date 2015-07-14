/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2014 eBay Software Foundation                                │
 │                                                                             │
 │   ,'""`.                                                                    │
 │  / _  _ \  Licensed under the Apache License, Version 2.0 (the "License");  │
 │  |(@)(@)|  you may not use this file except in compliance with the License. │
 │  )  __  (  You may obtain a copy of the License at                          │
 │ /,'))((`.\                                                                  │
 │(( ((  )) ))    http://www.apache.org/licenses/LICENSE-2.0                   │
 │ `\ `)(' /'                                                                  │
 │                                                                             │
 │   Unless required by applicable law or agreed to in writing, software       │
 │   distributed under the License is distributed on an "AS IS" BASIS,         │
 │   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  │
 │   See the License for the specific language governing permissions and       │
 │   limitations under the License.                                            │
 \*───────────────────────────────────────────────────────────────────────────*/
'use strict';

var url = require('url');


var slice, clone, INVALID_HEADERS;
slice = clone = Function.prototype.call.bind(Array.prototype.slice);
INVALID_HEADERS = ['content-length', 'date'];


/**
 * Determines if the header is `valid` or `invalid`, returning
 * a boolean value which reflect said determination.
 * @param header the name of the header to test
 * @returns {boolean} true if the header is valid, or false if not.
 */
exports.isValidHeader = function isValidHeader(header) {
    return !~INVALID_HEADERS.indexOf(header);
};


/**
 * Adds the properties to the provided object as defined
 * by var args.
 *
 * var obj = namespace({}, 'foo', 'bar', 'baz');
 * // obj = { foo: { bar : { baz: {} } }
 * @returns {*} the provided object
 */
exports.namespace = function namespace(/*obj, props...*/) {
    var args, dest, prop;

    args = clone(arguments);
    dest = args.shift();

    while (args.length) {
        prop = args.shift();
        dest = dest[prop] || (dest[prop] = {});
    }

    return dest;
};


/**
 * Creates a curried function that creates, if necessary,
 * an object hierarchy prior to providing the object
 * and property name to the provided callback.
 * @param dest
 * @param fn
 * @returns {Function}
 */
exports.ns = function ns(dest, fn) {
    return function (name) {
        var props, obj;

        props = name.split(':');
        props.unshift(dest);
        name = props.pop();

        obj = exports.namespace.apply(null, props);
        fn(obj, name);
    };
};


/**
 * Creates a curried function that ensures a property in
 * an object hierarchy exists prior to passing it to the
 * provided callback. If one doesn't exists it is created.
 * @param dest
 * @param fn
 * @returns {*}
 */
exports.init = function init(dest, fn) {
    return exports.ns(dest, function (obj, prop) {
        obj[prop] = (typeof obj[prop] !== 'undefined') ? obj[prop] : 0;
        fn(obj, prop);
    });
};


/**
 * Creates a curried function that ensures a property exists
 * in an object prior to passing it to the provided callback.
 * @param dest
 * @param fn
 * @returns {*}
 */
exports.maybe = function maybe(dest, fn) {
    return exports.ns(dest, function (obj, name) {
        if (obj[name] !== undefined) {
            fn(obj, name);
        }
    });
};


/**
 * Traverses an object hierarchy, invoking the provided function
 * with any non-object value and assigns the result of the function
 * invocation to the property.
 * @param obj
 * @param fn
 * @returns {{}}
 */
exports.map = function map(obj, fn) {
    var dest = {};
    Object.keys(obj).forEach(function (prop) {
        var value = obj[prop];
        if (typeof value === 'object') {
            dest[prop] = map(value, fn);
        } else {
            dest[prop] = fn(value);
        }
    });
    return dest;
};


/**
 * Adds the length of all properties in the given object.
 * @param obj
 * @returns {Object}
 */
exports.sum = function sum(obj) {
    if (typeof obj !== 'object') {
        throw new TypeError("sum called on non-object");
    }
    return Object.keys(obj).reduce(function (prev, curr) {
        return prev + obj[curr].length;
    }, 0);
};


/**
 * Parses the provided string as JSON. If successful, returns
 * the parsed JSON object, otherwise the error if unsuccessful.
 * @param data
 * @returns {*}
 */
exports.tryParse = function tryParse(data) {
    var obj;

    try {
        obj = JSON.parse(data);
    }
    catch (e) {
        obj = e;
    }

    return obj;
};


/**
 * Transforms all properties within an object hierarchy using the
 * provided function
 * @param obj the object to travers
 * @param prop the property to locate
 * @param fn the transformer implementation
 */
exports.transform = function transform(obj, prop, fn) {
    if (typeof obj !== 'object' || obj === null) {
        return;
    }

    Object.keys(obj).forEach(function (key) {
        if (key === prop) {
            obj[key] = fn(obj[key]);
        } else {
            transform(obj[key], prop, fn);
        }
    });
};


/**
 * Creates a function that rewrites paths using the provided host and port
 * @protocol the protocol to use when rewriting
 * @param host the host to use when rewriting
 * @param registry an Url object of the registry to use
 * @returns {Function} a fn which accepts the path to rewrite and returns the rewritten path.
 */
exports.rewriter = function rewriter(host, registry) {
    return function rewrite(path) {
        if (typeof path === 'string') {
            path = url.parse(path);
            path.pathname = path.pathname.replace(registry.pathname, '') || '/';
            path.protocol = host.protocol;
            path.hostname = host.hostname;
            path.port = host.port;
            path.host = undefined;
            path = path.format();
        }
        return path;
    };
};


/**
 * Extracts the *client* request host information from the request (i.e. takes into account x-forwarded-proto)
 * This allows us to know the protocol, host, and port of the originating request.
 * @param request
 * @returns {{protocol: *, hostname: *, port: *}}
 */
exports.hostInfo = function hostInfo(request) {
    var protocol, uri;

    protocol = request.headers['x-forwarded-proto'] || request.server.info.protocol;
    protocol = exports.suffix(protocol, ':');
    uri = url.parse(protocol + '//' + request.info.host);

    return {
        'protocol': uri.protocol,
        'hostname': uri.hostname,
        'port': uri.port
    };
};


/**
 * Ensures the provided suffix is at the end of a string,
 * and if not adds it.
 * @param str
 * @param chars
 */
exports.suffix = function suffix(str, chars) {
    if (typeof(str) === 'string' && typeof(chars) === 'string') {
        return str.slice(-chars.length) === chars ? str : str + chars;
    }
    return str;
};
