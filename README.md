Kappa
======

[![Build Status](https://travis-ci.org/krakenjs/kappa.png)](https://travis-ci.org/krakenjs/kappa)
[![NPM version](https://badge.fury.io/js/kappa.png)](http://badge.fury.io/js/kappa)

Based on [npm-delegate] (https://npmjs.org/package/npm-delegate) by Jason Denizac <jason@denizac.org>, this module
is a hapi plugin used to proxy npm to support private npm repos without replicating the entire public registry.

> NOTE: The `config.json` described below is a [Hapi Composer manifest](http://spumko.github.io/resource/api/#hapi-composer)
that describes kappa as a plugin. See [./example/global/config.json](example/global/config.json) or
[./example/local/config.json](example/local/config.json) for more information.

#### Quickstart

##### Global Installation
```bash
$ npm install -g kappa
$ kappa -c config.json
```

##### Local Installation
If you choose to install locally, running kappa is as easy as
```bash
$ npm init
$ npm install --save kappa

# add start script to package.json:
#    "scripts": {
#        "start": "kappa -c config.json",
#    }

$ npm start
```

You can then put those artifacts (`config.json` and `package.json`) under source control for simple deployments later:
```bash
$ git clone git@github.com:me/myregistry.git
$ cd myregistry
$ npm install
$ npm start
```

#### Options
kappa plugin currently supports the following parameters

- `vhost` (optional) - the virtual host associated with the kappa server, e.g. 'npm.mydomain.com'
- `paths` (optional) - any ordered array of npm repositories to use, e.g. Defaults to `['http://localhost:5984/registry/_design/app/_rewrite/', 'https://registry.npmjs.org/']`
- `rewriteTarballs` (optional) - Rewrite tarball URLs to send all traffic through the configured server. Setting to false allows tarballs to be downloaded directly from the server
that fulfilled the package request. Defaults to `true`.

For read operations (GET, HEAD, etc) the proxy will first attempt to fetch the module from the first registry.
If the requested module is not found it continues to the next registry, and so on.

For write operations the proxy will only attempt to write to the FIRST registry. All auth occurs with the first registry as well.
