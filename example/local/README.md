#### Local Installation
```bash
$ npm init
$ npm install --save kappa
$ ./node_modules/.bin/kappa -c config.json

# or add "run" script to package.json:
#    "scripts": {
#        "run": "kappa -c config.json",
#    }
```


#### Options
- `-c, --config` - The Hapi manifest describing your kappa installation.
- `-b, --basedir` (optional) - The base directory of the kappa config and associated files. Defaults to `process.cwd()`.

