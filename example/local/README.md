#### Local Installation
```bash
$ npm init
$ npm install --save kappa
$ ./node_modules/.bin/kappa -c config.json

# or add start script to package.json:
#    "scripts": {
#        "start": "kappa -c config.json",
#    }
```


#### Options
- `-c, --config` - The Hapi manifest describing your kappa installation.
- `-b, --basedir` (optional) - The base directory of the kappa config and associated files. Defaults to `process.cwd()`.

