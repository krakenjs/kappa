[![Build Status](https://travis-ci.org/paypal/kappa.png)](https://travis-ci.org/paypal/kappa)

Kappa
======

Based on [npm-delegate] (https://npmjs.org/package/npm-delegate) by Jason Denizac <jason@denizac.org>, this module
is a hapi plugin used to proxy npm to support private npm repos without replicating the entire public registry.

#### Quickstart
Deploying a kappa server only requires 2 artifacts. These files can be put under source control and
deployed via any mechansim.
- `package.json` file 
- a Hapi Composer manifest (`config.json`)
 


First, create a `package.json` file for your server, adding `kappa` as a dependency and a startup script
to kick off the server.
```bash
$ npm init
# ...
$ npm install --save kappa # or manually add kappa to your dependencies
```

```javascript
// package.json
{
    "scripts": {
        "start": "./node_modules/.bin/hapi -c config.json"
    }
}
```

Then, create a `config.json` file which is a [Hapi Composer manifest](http://spumko.github.io/resource/api/#hapi-composer)
file. This will have any custom settings for your particular installation. (See the example config `example/config.json`
for layout and the `config` section below for kappa-specific configuration options.)

Once the two artifacts have been deployed to your server, simply run it.
```bash
$ npm install
$ npm start
```


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
