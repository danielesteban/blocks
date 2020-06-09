[blocks](https://blocks.gatunes.com/)
[![Build Status](https://travis-ci.org/danielesteban/blocks.svg?branch=master)](https://travis-ci.org/danielesteban/blocks)
==

> webxr multiplayer voxels engine

#### Server configuration

 * `CLIENT` serve the client (boolean, defaults to true)
 * `GENERATOR` the world [generator](server/generators.js) function
 * `MAX_CLIENTS` the maximum concurrent players (defaults to 16)
 * `PRELOAD` a chunk radius around the spawn area to be preloaded
 * `SEED` 16bit world generation seed. (0 - 65535)
 * `STORAGE` directory in where to store the generated/modified chunks

```bash
# random seed, no preload, 16 clients
node server/main.js
# same, but preloading a 10 chunk radius around the spawn area
PRELOAD=10 node server/main.js
# server-only flat world for only 4 clients with persistence
CLIENT=false GENERATOR=flat MAX_CLIENTS=4 PRELOAD=10 SEED=1234 STORAGE=./data node server/main.js
# heightmap driven world generator
HEIGHTMAP=./island.png GENERATOR=heightmap node server/main.js
```

#### docker-compose

```yaml
version: '3'
services:
  server:
    image: danigatunes/blocks:latest
    environment:
     - PRELOAD=10
     - SEED=1234
     - STORAGE=/data
    ports:
     - "80:8080"
    volumes:
     - "data:/data"
volumes:
  data:
```

#### If you deployed a server and would like it to appear on the public list

Add it to [servers.json](servers.json) and make a PR or drop me a line on [twitter](https://twitter.com/DaniGatunes)

#### Local development

webxr requires an https origin. to test with headsets on your local network:

```bash
# generate a self-signed cert/key:
openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 -keyout server.key -out server.crt
# start the server with TLS
TLS_CERT=server.crt TLS_KEY=server.key npm start
```
