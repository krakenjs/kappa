'use strict';

var hapi = require('hapi'),
    delegate = require('./delegate');


var LogLevel = {
    emerg: 0,
    alert: 1,
    crit: 2,
    error: 3,
    warning: 4,
    notice: 5,
    info: 6,
    debug: 7
};

exports.create = function (settings) {
    var server, vhost, read, write;

    server = new hapi.Server('localhost', parseInt(process.env['TURNIP_PORT'], 10) || 8000);
    vhost  = settings.vhost;
    read   = delegate.createHandler(settings.paths);
    write  = delegate.createHandler(settings.paths.slice(0, 1));

    // GETs always get proxied
    server.route({
        method: 'GET',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: read,
            payload: 'stream'
        }
    });

    // POST and PUTs always go to first service only (writeDelegate)
    server.route({
        method: 'POST',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    server.route({
        method: 'PUT',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    server.route({
        method: 'DELETE',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    setInterval(function () {
        server.log(['info', 'stats'], JSON.stringify(delegate.getStats(), null, ''));
    }, 5000);


    function log(event, tags) {
        var level, allTags = [];

        // Find the tag that's gte configured log level
        Object.keys(tags).forEach(function (tag) {
            tag = tag.toLowerCase();

            if (!LogLevel.hasOwnProperty(tag)) {
                allTags.push(tag);
                return;
            }

            if ((!level || LogLevel[tag] > LogLevel[level]) && LogLevel[tag] <= LogLevel[settings.logLevel]) {
                level = tag;
            }
        });

        level && allTags.unshift(level);

        if (allTags.length) {
            allTags = allTags.map(function (tag) {
                return tag.toUpperCase();
            });
            // Ugh. Bug that timestamp is different between server and request loggers?
            console.log((new Date(event.timestamp || event._timestamp)).toISOString(), allTags.join(','), event.data || 'unspecified');
        }
    }

    // Logging
    settings.logLevel = settings.logLevel || 'debug';
    server.on('log', log);
    server.on('request', function (request, event) {
        server.log(event.tags, event.data)
    });

    return server;
};