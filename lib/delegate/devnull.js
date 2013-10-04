'use strict';

var util = require('util'),
    stream = require('stream');


/**
 * A noop write stream for handling discarded responses
 * @constructor
 */
function DevNull() {
    DevNull.super_.apply(this, arguments);
    this.statusCode = 200;
}

util.inherits(DevNull, stream.Writable);


DevNull.prototype.setHeader = function (name, value) {
    // noop
};


DevNull.prototype._write = function (chunk, encoding, callback) {
    // noop
    callback();
};


module.exports = DevNull;