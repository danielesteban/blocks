[blocks](https://blocks.gatunes.com/)
[![Build Status](https://travis-ci.org/danielesteban/blocks.svg?branch=master)](https://travis-ci.org/danielesteban/blocks)
==

> webxr multiplayer voxels engine

 * [Public alpha test](https://blocks.gatunes.com/)

#### Server configuration

 * `GENERATOR` the world [generator](server/generators.js) function
 * `MAX_CLIENTS` the maximum concurrent players (defaults to 16)
 * `PRELOAD` a radius of chunks around the spawn area to preload
 * `SEED` 16bit world generation seed. (0 - 65535)
 * `STORAGE` Absolute path in where to store the generated/modified chunks

```bash
GENERATOR=flat MAX_CLIENTS=4 PRELOAD=10 SEED=1234 STORAGE=./data node server/main.js
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
