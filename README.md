# npm-delegate
a hierarchical npm-registry proxy to make private registries easier

npm registries all the way down.

## wherefore?

say you want to set up a local, private npm registry for certain modules, but you still want to be able to install public modules. Sure, thanks to couchdb, you could replicate the entire public registry down - but that's tens of gigabytes of extra disk space you'd need.


                              +--+
    +------------+            |p |
    | client     |   'foo'?   |r |          +------------+
    |            |  --------> |o |  'foo'?  |            |
    |            |            |x |  ------> | private    |
    |            |            |y | <------  | registry   |
    |            |            |  |    404   +------------+
    |            |            |  |          'foo'?     +---------------+
    |            |            |  |  -----------------> |               |
    |            |            |  | <-----------------  |  public       |
    |            | <--------  |  |         'foo'       |  registry     |
    +------------+    'foo'   +--+                     +---------------+


## usage

run `npm-registry` somewhere - possibly on the server where you're running couchdb for your registry.

    node npm-registry registry1 registry2 registry3

eg

    node npm-registry -p 1337 http://localhost:5984/registry https://registry.npmjs.org

setup your npm client:

    npm do-some-stuff

List as many registries as you want in fall-back order as command line arguments when startingnpm-registry.

## note: proxy is read-onlys

Only GET requests are allowed. Strange things happens when you send state-changing requests around willy-nilly, and that's probably not what you want. For example, to publish a module, you probably want to specify which registry you're publishing it to, eg

    $ npm publish --registry http://mysweetregistry.com

See also: [how to specify a registry to publish to in your package.json](https://npmjs.org/doc/registry.html#I-don-t-want-my-package-published-in-the-official-registry-It-s-private)

Options

## faqs

*does this run a registry for me?*
no

*how do I set up my own private registry?*
read this: [https://github.com/isaacs/npmjs.org](https://github.com/isaacs/npmjs.org)

## license
MIT
(c) 2012 jden - Jason Denizac <jason@denizac.org>
http://jden.mit-license.org/2012