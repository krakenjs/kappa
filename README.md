turnip
======
¡NPM GOTCHA! Be sure to comment out the block called `// legacy kludge` ... `// end kludge` in
`registry > _design/app > shows` as it rewrites tarball paths **back** to internal registry paths. Yuck.

![turnip](https://github.paypal.com/ertoth/turnip/raw/master/img/tunip.png "turnip")

Based on [npm-delegate] (https://npmjs.org/package/npm-delegate) by Jason Denizac <jason@denizac.org>, this module
is a hapi plugin used to proxy npm to support private npm repos without replicating the entire public registry.
Configure the plugin with a paths array of repositories to hit in order:

```javascript
{
    paths: ['http://10.9.110.82:5984/registry/_design/app/_rewrite/', 'http://registry.npmjs.org/']
}
```

For read operations (GET, HEAD, etc) the proxy will first attempt to fetch the module from the first registry.
If the requested module is not found it continues to the next registry, and so on.

For write operations the proxy will only attempt to write to the FIRST registry. All auth occurs with the first registry as well.


