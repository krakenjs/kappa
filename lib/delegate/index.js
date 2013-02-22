'use strict';

var delegate = require('./delegate');

exports.register = function (server, options, next) {
    var paths = options.paths,
        readDelegate = delegate.handler(paths),
        writeDelegate = delegate.handler(paths.slice(0, 1));

    // GETs always get proxy-ed
    server.route({
        method: 'GET',
        path: '/{p*}',
        handler: readDelegate
    });

    // POST and PUTs always go to first service only (writeDelegate)
    server.route({
        method: 'POST',
        path: '/{p*}',
        config: {
            handler: writeDelegate,
            payload: 'stream'
        }
    });

    server.route({
        method: 'PUT',
        path: '/{p*}',
        config: {
            handler: writeDelegate,
            payload: 'stream'
        }
    });

    next();
};