'use strict';

var delegate = require('./lib/delegate');

exports.register = function (server, options, next) {
    var paths = options.paths,
        readDelegate = delegate.createHandler(paths),
        writeDelegate = delegate.createHandler(paths.slice(0, 1));

    // GETs always get proxied
    server.route({
        method: 'GET',
        path: '/{p*}',
        vhost: options.vhost,
        handler: readDelegate
    });

    // POST and PUTs always go to first service only (writeDelegate)
    server.route({
        method: 'POST',
        path: '/{p*}',
        vhost: options.vhost,
        config: {
            handler: writeDelegate,
            payload: 'stream'
        }
    });

    server.route({
        method: 'PUT',
        path: '/{p*}',
        vhost: options.vhost,
        config: {
            handler: writeDelegate,
            payload: 'stream'
        }
    });

    next();
};
