'use strict';

var url = require('url'),
    http = require('http'),
    Hapi = require('hapi'),
    https = require('https'),
    stats = require('../stats'),
    DevNull = require('./devnull');


var protocols = {
    'http:': {
        module: http,
        agent: new http.Agent({ maxSockets: 250 })
    },
    'https:': {
        module: https,
        agent: new https.Agent({ maxSockets: 250, rejectUnauthorized: false })
    }
};


var proto = {

    proxy: function (req) {
        var resource, options, child;

        resource = url.resolve(this.registry, req.path.substring(1));
        options = url.parse(resource);
        options.method = req.method.toLowerCase();
        options.agent = protocols[options.protocol].agent;

        // Copy headers, deleting host. The correct host header (different from
        // this host) is automatically added by node http internals.
        options.headers = Hapi.utils.clone(req.raw.req.headers);
        delete options.headers.host;

        // HACK: Only ever send auth to first server.
        // This is a unique situation where, for writes we ONLY go to a single
        // repo so this is a noop, but for GETs we fallback to others. If we
        // fallback, we don't want our Basic auth headers sent to downstream
        // services since 1) they won't be of any use, and 2) they expose us.
        this.index > 0 && delete options.headers.authorization;

        // Spawn the child request
        child = protocols[options.protocol].module.request(options);
        child.on('error', this.oncomplete);
        child.on('response', this._onresponse.bind(this, req));
        child.setTimeout(5000, child.abort.bind(child));
        req.raw.req.pipe(child);
    },


    _onresponse: function (outgoing, incoming) {
        var dest;

        // Determine if we should move on to the next registry. If so, the current
        // spawned child response gets piped to devnull and we move on.
        dest = (!this.isLast && incoming.statusCode === 404) ? new DevNull() : outgoing.raw.res;
        dest.on('error', this.oncomplete);
        dest.on('finish', this.oncomplete);

        // Not useful, so just dispose (Not a big fan of this. Think it could be
        // cleaned-up/more clear.)
        if (dest instanceof DevNull) {
            incoming.pipe(dest);
            return;
        }

        // BINGO! So stream the child response to the original request.
        // We do this instead of piping to the raw response so we can
        // take advantage of Hapi behavior and don't miss out on things
        // like the server 'response' event.
        dest = outgoing.reply(incoming).code(incoming.statusCode);
        Object.keys(incoming.headers).forEach(function (header) {
            dest.header(header, incoming.headers[header]);
        });
    },

    get isLast () {
        return this.index === this.registries.length - 1;
    }
};


exports.create = function (item, index, items) {

    return Object.create(proto, {

        registry: {
            value: item,
            enumerable: true
        },

        index: {
            value: index,
            enumerable: true
        },

        registries: {
            value: items,
            enumerable: true
        },

        oncomplete: {
            value: undefined,
            writable: true,
            enumerable: true
        }

    });

};



/**
 * Adds the length of all properties in the given object.
 * @param obj
 * @returns {Object}
 */
function sum(obj) {
    return Object.keys(obj).reduce(function (prev, curr) {
        return prev + obj[curr].length;
    }, 0);
}

// Setup samplers for properties of each protocol
Object.keys(protocols).forEach(function (protocol) {
    var agent = protocols[protocol].agent;

    stats.sample(protocol + 'sockets:queued', function getRequestQueueSize() {
        return sum(agent.requests);
    });


    stats.sample(protocol + 'sockets:active', function getActiveSocketCount() {
        return sum(agent.sockets);
    });


    stats.sample(protocol + 'sockets:max', function getMaxSockets() {
        return agent.maxSockets;
    });
});