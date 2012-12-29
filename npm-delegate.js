var optimist = require('optimist')
var fallback = require('fallback')
var http = require('http')
var https = require('https')
var url = require('url2')

var argv = optimist
  .usage('Compose multiple npm registries in fallback order.\nUsage: $0 [opts] host1/registry host2/registry ... hostN/registry')
  .alias('p','port')
    .default('p',5983)
    .describe('p', 'port to listen on')
  .alias('s','secure')
    .default(false)
    .boolean('s')
    .describe('s', 'run the proxy using https?')
  .check(function (argv) {
    if (!argv._.length)
      throw new Error('you must specify at least one registry (two to be useful)')
  })
  .argv;

var registries = argv._.map(parseRegistry)

function parseRegistry(string) {
  var parsed = url.parse(string)
  if (!/http(s?):/.test(parsed.protocol))
    die('invalid registry address: specify a protocol (eg https://): ' + string)

  parsed.port || (parsed.port = 80)

  return parsed
}

(argv.secure ? https : http).createServer(delegate).listen(argv.port)
console.log('proxy started')
console.dir(registries.map(url.format))


function delegate(req, resOut) {

  if (req.method !== 'GET') {
    console.log('invalid method')
    resOut.statusCode = 405
    resOut.write(JSON.stringify({error: 'invalid method'}))
    resOut.end()
    return
  }

  fallback(registries, function (registry, cb) {
    console.log('forwarding to ' + registry.hostname)
    forward(req, registry, function (err, res) {
      if (!err) {
        return cb(null, res)
      }
      console.log('err calling ' + registry.hostname + '. ' + err)
      return cb()
    })

  }, function (err, resIn, registry) {
    if (err) {
      resOut.write(JSON.stringify({error: 'There was an error resolving your request:\n' + JSON.stringify(err, null, 2)}))
      return resOut.end()
    }
    else if (!resIn) {
      resOut.statusCode = 400
      resOut.write(JSON.stringify({error: 'request could not be fulfilled by any of the registries on this proxy.'
        + 'perhaps the module you\'re looking for does not exist'}))
      resOut.end()
    } else {
      console.log('proxying response from registry' + url.format(registry))
      resOut.setHeader('x-registry', url.format(registry))
      pipeRes(resIn, resOut)
    }
  });


}

function forward(reqIn, registry, cb) {
  var reqOut = {
    hostname: registry.hostname
  , port: registry.port
  , path: rebase(registry.path, reqIn.url)
  , headers: reqIn.headers
  , method: reqIn.method
  , auth: registry.auth
  }
  delete reqOut.headers.host
  delete reqOut.headers.authorization


  console.log('fwd req', reqOut)
  reqOut = (/https/.test(reqOut.protocol) ? https : http).request(reqOut, function (res) {
    console.log('res received')
    if (res.statusCode >= 400) {
      console.log('bad response from ' + registry.hostname + ' ' + res.statusCode)
      res.pipe(process.stdout)
      return cb(new Error('Response from ' + registry.hostname + ': ' + res.statusCode))
    }
    return cb(null, res);
  }).on('error', cb);
  reqOut.end();
}

function pipeRes(resFrom, resTo) {
  copyHeaders(resFrom, resTo)
  resFrom.pipe(resTo)
}

function copyHeaders(resFrom, resTo) {
  resTo.statusCode = resFrom.statusCode;
  for (var header in resFrom.headers) {
    resTo.setHeader(header, resFrom.headers[header])
  }
}


function rebase(pathBase, path) {
    console.log(pathBase, path)

    if (pathBase != '/registry') {
      return path.replace('/registry','')
    }

    if (path.indexOf('/registry') != 0) {
      return '/registry' + path;
    }
}


function die(msg) {
  console.error(msg)
  process.exit(1)
}