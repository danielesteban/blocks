[blocks](https://blocks.gatunes.com/)
[![Build Status](https://travis-ci.org/danielesteban/blocks.svg?branch=master)](https://travis-ci.org/danielesteban/blocks)
==

> webxr multiplayer voxels engine

#### Server configuration

 * `GENERATOR` the world [generator](server/generators.js) function
 * `HEIGHTMAP` a png heightmap to drive the heightmap world generator function
 * `MAX_CLIENTS` the maximum concurrent players (defaults to 16)
 * `PRELOAD` a radius of chunks around the spawn area to preload
 * `SEED` 16bit world generation seed. (0 - 65535)
 * `STORAGE` Absolute path in where to store the generated/modified chunks

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

WebXR requires an HTTPS origin. To test with a headset on your local network:

```bash
# First generate a self-signed cert/key:
openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 -keyout server.key -out server.crt
# Then start the server with TLS
TLS_CERT=server.crt TLS_KEY=server.key npm start
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
