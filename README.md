Kappa
======

Based on [npm-delegate] (https://npmjs.org/package/npm-delegate) by Jason Denizac <jason@denizac.org>, this module
is a hapi ~~plugin~~ application used to proxy npm to support private npm repos without replicating the entire public registry.

#Configuration
Kappa can be configured via `./config/settings.json`.

- **`paths`:** An array of repositories to hit in ascending order.
- **`port`:** The starting port for the server. Default is `8000`. If an environment variable `KAPPA_PORT` or `PORT` is set, it will override the settings file.
- **`vhost`:** If multiple services are hosted on a server, this allows you to specify the vhost name. Default is `localhost`.
- **`logLevel`:** Logging for Kappa. Default is `info`. Can be set to `debug` for additional output

The following example shows a private couchDB based npm repository, followed by the public npm repository, set to start on port 8000:


```javascript
{
    "paths": ['http://privateServer:5984/registry/_design/app/_rewrite/', 'http://registry.npmjs.org/'],
    "port": 8000,
    "vhost": "localhost",
    "debugLevel": "info"
}
```

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

# Contributing to the Kappa

### Bug Fixes

If you find a bug you would like fixed. Open up a [ticket](https://github.com/PayPal/kappa/issues/new) with a detailed description of the bug and the expected behaviour. If you would like to fix the problem yourself please do the following steps.

1. Fork it.
2. Create a branch (`git checkout -b fix-for-that-thing`)
3. Commit a failing test (`git commit -am "adds a failing test to demonstrate that thing"`)
3. Commit a fix that makes the test pass (`git commit -am "fixes that thing"`)
4. Push to the branch (`git push origin fix-for-that-thing`)
5. Open a [Pull Request](https://github.com/PayPal/kappa/pulls)

Please keep your branch up to date by rebasing upstream changes from master.

### New Functionality

If you wish to add new functionality to Kappa, please provide [the Kappa team](mailto:DL-PP-NodeJS-CoreTeam@paypal.com) an example application that demonstrates deficiency in current design or desired additional behaviour. You may also submit a pull request with the steps above.


