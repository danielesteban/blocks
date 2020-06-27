[blocks](https://blocks.gatunes.com/)
[![Build Status](https://travis-ci.org/danielesteban/blocks.svg?branch=master)](https://travis-ci.org/danielesteban/blocks)
==

> webxr multiplayer voxels engine

#### Create your own server in two steps:

* [Remix glitch.com/~blocks-server](https://glitch.com/edit/#!/remix/blocks-server)
* Create a `.env` file with this variables:
  * `NAME` the server name (for the public registry)
  * `SEED` 16bit world generation seed. (0 - 65535)

#### You can also use docker-compose if you already own a more powerful server:

```yaml
version: '3'
services:
  server:
    image: danigatunes/blocks:latest
    environment:
     - NAME=Your Server Name
     - PRELOAD=10
     - PUBLIC_URL=https://yourserver.url/
     - SEED=1234
     - STORAGE=/data
    ports:
     - "80:8080"
    volumes:
     - "data:/data"
volumes:
  data:
```

#### Want your server to show up on the in-game map?

At the moment, the main server list verification it's a bit of a manual process.
I will check the list from time to time and manually approve them after checking they work correctly.
I need to write better tools to streamline the process, but there's other priorities right now.
If you want to speed this up, you can always drop me a line on [twitter](https://twitter.com/danigatunes) with the url of your server.

#### Server configuration

 * `CLIENT` serve the client (boolean, defaults to false)
 * `GENERATOR` the world [generator](server/generators.js) function
 * `MAX_CLIENTS` the maximum concurrent players (defaults to 16)
 * `NAME` the server name (for the public registry)
 * `PRELOAD` a chunk radius around the spawn area to be preloaded
 * `PUBLIC_URL` public url of the server (for the public registry)
 * `SEED` 16bit world generation seed. (0 - 65535)
 * `STORAGE` directory in where to store the generated/modified chunks

```bash
# random seed, no preload, 16 clients
node server/main.js
# same, but preloading a 10 chunk radius around the spawn area
PRELOAD=10 node server/main.js
# flat world for only 4 clients with persistence
GENERATOR=flat MAX_CLIENTS=4 PRELOAD=10 SEED=1234 STORAGE=./data node server/main.js
# heightmap driven world generator
HEIGHTMAP=./island.png GENERATOR=heightmap node server/main.js
```

#### Local development

webxr requires an https origin. to test with headsets on your local network:

```bash
# generate a self-signed cert/key:
openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 -keyout server.key -out server.crt
# start the server with TLS
TLS_CERT=server.crt TLS_KEY=server.key npm start
```
