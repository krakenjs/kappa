/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2013 eBay Software Foundation                                │
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

var slice = Array.prototype.slice;


function clone(arr) {
    return slice.call(arr);
}


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
    }
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
            fn(obj, name)
        }
    });
};


/**
 * Traverses an object hierarchy, invoking any found functions
 * and copyies the result of the function invocation to the
 * destination object.
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
    return Object.keys(obj).reduce(function (prev, curr) {
        return prev + obj[curr].length;
    }, 0);
};