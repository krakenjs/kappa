Kappa
======

![kappa](https://github.paypal.com/webcore/turnip/raw/seaMonster/img/kappa.png "kappa")

Based on [npm-delegate] (https://npmjs.org/package/npm-delegate) by Jason Denizac <jason@denizac.org>, this module
is a hapi ~~plugin~~ application used to proxy npm to support private npm repos without replicating the entire public registry.
Configure the plugin with a paths array of repositories to hit in order:

```javascript
{
    paths: ['http://10.9.110.82:5984/registry/_design/app/_rewrite/', 'http://registry.npmjs.org/']
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

##### Installation Notes

```bash

$ sudo /usr/sbin/adduser -r --shell /bin/bash --comment "Private NPM Server User Account" kappa
$ cd /x/web/
$ git clone git://github.com/paypal/kappa.git
$ sudo chown -R kappa:kappa /x/web/kappa/
$ sudo cp /x/web/kappa/scripts/kappa /etc/init.d/
$ sudo /sbin/service kappa start
$ sudo chmod 700 /x/web/kappa/scripts/kappa_monitrc
$ sudo monit -d 60 -c /x/web/kappa/scripts/kappa_monitrc
$ # sudo cp /x/web/kappa/scripts/kappa_monitrc /etc/monit.d/
$ tail /var/log/kappa.log
$ sudo cp /x/web/kappa/scripts/kappa.conf /etc/nginx/conf.d/
$ sudo /etc/init.d/nginx restart
```
