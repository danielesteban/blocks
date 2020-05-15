const compression = require('compression');
const express = require('express');
const expressWS = require('express-ws');
const helmet = require('helmet');
const path = require('path');
const World = require('./world');

const world = new World({
  seed: process.env.SEED ? parseInt(process.env.SEED, 10) : undefined,
  preload: process.env.PRELOAD ? parseInt(process.env.PRELOAD, 10) : undefined,
});

const server = express();
server.use(compression());
server.use(helmet());
server.use(express.static(path.join(__dirname, '..', 'client')));
expressWS(server, null, { clientTracking: false, perMessageDeflate: true });
server.ws('/', world.onClient.bind(world));
server.get('/sync', (req, res) => res.end(`${Date.now()}`));
server.use((req, res) => res.status(404).end());
server.listen(process.env.PORT || 8080);
