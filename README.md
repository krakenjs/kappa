Kappa
======

Based on [npm-delegate] (https://npmjs.org/package/npm-delegate) by Jason Denizac <jason@denizac.org>, this module
is a hapi ~~plugin~~ application used to proxy npm to support private npm repos without replicating the entire public registry.

##### Quickstart
To define your server:
```bash
$ npm init
# call the module whatever you want: `my-private-repo`

$ npm install --save kappa
$ touch config.json
# see the config options below
```

To start your server, drop the 2 file from the above step (package.json & config.json) on your server...
```bash
$ npm install -g hapi
$ npm install
$ hapi -c config.json
```


##### Config
kappa configuration currently supports the following parameters

`vhost` - the virtual host associated with the kappa server
`paths` - any ordered array of npm repositories to use, e.g. `['http://privateServer:5984/registry/_design/ghost/_rewrite/', 'http://registry.npmjs.org/']`

For read operations (GET, HEAD, etc) the proxy will first attempt to fetch the module from the first registry.
If the requested module is not found it continues to the next registry, and so on.

For write operations the proxy will only attempt to write to the FIRST registry. All auth occurs with the first registry as well.



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

