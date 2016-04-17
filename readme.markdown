# tumblr-map

> some experimental stuff with the tumblr api + graphviz

## install

u need [node](https://nodejs.org) and [graphviz](https://graphviz.org) (and probably a unix-like system)

install the deps:

```sh
$ npm i uuid babel-cli babel-preset-es2015 babel-preset-stage-2
# or simply
$ npm i
```

## usage

u need oauth credentials in order to use the api, you can register a new app here.

```sh
$ export CONSUMER_KEY=...
$ export CONSUMER_SECRET=...
$ export TOKEN=...
$ export TOKEN_SECRET=...
$ node_modules/.bin/babel-node app > result.log

# ...

$ node_modules/.bin/babel-node inspect < result.log > graph.dot
$ sfdp -Tpng graph.dot > graph.png

# yay \o/
```

## license

MIT
