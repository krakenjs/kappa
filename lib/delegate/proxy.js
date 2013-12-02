/*───────────────────────────────────────────────────────────────────────────*\
│  Copyright (C) 2013 eBay Software Foundation                                │
│                                                                             │
│hh ,'""`.                                                                    │
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

var url = require('url'),
    http = require('http'),
    Hapi = require('hapi'),
    https = require('https'),
    util = require('../util'),
    stats = require('../stats'),
    DevNull = require('./devnull');

require('tls').SLAB_BUFFER_SIZE = 200 * 1024;

var protocols = {
    'http:': {
        module: http,
        agent: new http.Agent({ maxSockets: 10 })
    },
    'https:': {
        module: https,
        agent: new https.Agent({
            maxSockets: 10,
            rejectUnauthorized: false,
            ciphers: 'ALL:!aNULL:!eNULL:!DH:!ECDH:!MD5'
        })
    }
};


var proto = {

    proxy: function (req) {
        var resource, options, child;

        resource = url.resolve(this.registry, req.path.substring(1));
        options = url.parse(resource);
        options.method = req.method.toLowerCase();
        options.agent = this._tuneAgent(protocols[options.protocol].agent);

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
        dest.header('x-registry', this.registry);
        Object.keys(incoming.headers).forEach(function (header) {
            dest.header(header, incoming.headers[header]);
        });
    },

    _tuneAgent: function (agent) {
        var active, limit;

        //Experimental scaling of sockets based on sockets used.
        active = util.sum(agent.sockets);
        limit = Math.floor(agent.maxSockets * 0.75);

        if (active > limit) {
            agent.maxSockets += Math.floor(agent.maxSockets / 2);
        }

        return agent;
    },

    get isLast() {
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




// Setup samplers for properties of each protocol
Object.keys(protocols).forEach(function (protocol) {
    var agent = protocols[protocol].agent;

    stats.sample(protocol + 'sockets:queued', function getRequestQueueSize() {
        return util.sum(agent.requests);
    });


    stats.sample(protocol + 'sockets:active', function getActiveSocketCount() {
        return util.sum(agent.sockets);
    });


    stats.sample(protocol + 'sockets:max', function getMaxSockets() {
        return agent.maxSockets;
    });
});