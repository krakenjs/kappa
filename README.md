[![Build Status](https://travis-ci.org/paypal/kappa.png)](https://travis-ci.org/paypal/kappa)

Kappa
======

Based on [npm-delegate] (https://npmjs.org/package/npm-delegate) by Jason Denizac <jason@denizac.org>, this module
is a hapi plugin used to proxy npm to support private npm repos without replicating the entire public registry.

**Note:** You don't run Kappa by itself. It must be added as a dependency of your project.

#### Quickstart


1. Create an empty package.json in a new folder (`npm init`)
1. Install kappa (`npm install kappa --save`)
2. Add the start command to your package.json (see below)
2. Create a `config.json` file. (see below)
2. `npm start`
3. Verify that it works (http://localhost:8000/-/all)

Add this run script to your `package.json` file to easily start your Kappa instance with `npm start`
```javascript
{
    "scripts": {
        "start": "hapi -c config.json"
    }
}
```

A basic `config.json` file.

```javascript
{
    "servers": [
        {
            "host": "localhost",
            "port": 8000
        }
    ],
    "plugins": {
        "kappa": {
            "paths": [
                "https://registry.npmjs.org/"
            ]
        }
    }
}
```

####Hapi Composer manifest

The `config.json` file is a [Hapi Composer manifest](http://spumko.github.io/resource/api/#hapi-composer)
file. This will have any custom settings for your particular installation. (See the example config `example/config.json`
for layout and the `config` section below for kappa-specific configuration options.)

#### Configuration
kappa configuration currently supports the following parameters

- `vhost` - the virtual host associated with the kappa server, e.g. 'npm.mydomain.com'
- `paths` (optional) - any ordered array of npm repositories to use, e.g. Defaults to `['http://localhost:5984/registry/_design/ghost/_rewrite/', 'https://registry.npmjs.org/']`

For read operations (GET, HEAD, etc) the proxy will first attempt to fetch the module from the first registry.
If the requested module is not found it continues to the next registry, and so on.

For write operations the proxy will only attempt to write to the FIRST registry. All auth occurs with the first registry as well.

<!--
<br>
##### **¡NPM GOTCHAS!**
- Be sure to comment out the block called `// legacy kludge` ... `// end kludge` in
`registry > _design/app > shows` as it rewrites tarball paths **back** to internal registry paths. Yuck.

- Unsafe rewrites need to be enabled. :/

- Make sure registry table has a record with '_id' = 'error: forbidden' and 'forbidden' = 'must supply latest _rev to update existing package'


##### Known Issues
###### name.trim is not a function
```javascript
Error: case_clause {[{<<"message">>,<<"name.trim is not a function">>}]}
```
This error requires a CouchDB restart:
```bash
$ sudo /sbin/service couchdb restart
```
-->
