turnip
======
Based on [npm-delegate] (https://npmjs.org/package/npm-delegate) by Jason Denizac <jason@denizac.org>


An npm proxy server that enables fallback repositories.

```bash
# usage: turnip [options] <registry ...>
turnip -p 1234 http://localhost:5984/registry/_design/app/_rewrite http://registry.npmjs.org/
```

