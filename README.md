# kappa

[![Build Status](https://travis-ci.org/krakenjs/kappa.svg?branch=master)](https://travis-ci.org/krakenjs/kappa)  
[![NPM version](https://badge.fury.io/js/kappa.png)](http://badge.fury.io/js/kappa)  

Based on [npm-delegate](https://npmjs.org/package/npm-delegate) by Jason Denizac <jason@denizac.org>, this module
is a hapi plugin used to proxy npm to support private npm repos without replicating the entire public registry.

> NOTE: The `config.json` described below is a [Hapi Composer manifest](http://spumko.github.io/resource/api/#hapi-composer)
that describes kappa as a plugin. See [./example/global/config.json](example/global/config.json) or
[./example/local/config.json](example/local/config.json) for more information.

#### Quickstart

##### TL;DCO (too long; didn't check out)
Using [docker-compose](https://docs.docker.com/compose/install/), just run `docker-compose up` in a directory containing our [docker-compose.yml](docker-compose.yml) file. Soon after you'll have a working kappa instance set up to use a local couch instance (falling back to the public registry) on `0.0.0.0:8000`.

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

- `vhost` - the virtual host associated with the kappa server, e.g. 'npm.mydomain.com'
- `paths` (optional) - any ordered array of npm repositories to use, e.g. Defaults to `['http://localhost:5984/registry/_design/app/_rewrite/', 'https://registry.npmjs.org/']`
- `rewriteTarballs` (optional) - When `true` rewrites the tarball URL in packages to download each resource via kappa. When `false`, tarball URLs
are left untouched, allowing the client to download package tarballs directly from the registry that fulfilled the package request. Defaults to `true`.

For read operations (GET, HEAD, etc) the proxy will first attempt to fetch the module from the first registry.
If the requested module is not found it continues to the next registry, and so on.

For write operations the proxy will only attempt to write to the FIRST registry. All auth occurs with the first registry as well.

#### FAQs

##### I'm seeing `npm install` fail after a couple of minutes with: `npm ERR! shasum check failed for ...`
This is *likely* a result of the download exceeding node's default socket idle timeout. The best way to address this is by disabling the socket timeout for your server in the manifest.

``` json
{
    "host": "localhost",
    "port": 8000,
    "options": {
        "timeout": {
            "socket": false
        }
    }
}
```
