const compression = require('compression');
const express = require('express');
const expressWS = require('express-ws');
const helmet = require('helmet');
const path = require('path');
const Map = require('./map');
const World = require('./world');

const world = new World({
  generator: process.env.GENERATOR || 'default',
  maxClients: process.env.MAX_CLIENTS ? parseInt(process.env.MAX_CLIENTS, 10) : 16,
  seed: process.env.SEED ? parseInt(process.env.SEED, 10) : undefined,
  preload: process.env.PRELOAD ? parseInt(process.env.PRELOAD, 10) : undefined,
  storage: process.env.STORAGE,
});
const map = new Map({ world });

const app = express();
app.use(helmet());
app.use(compression());
expressWS(app, null, { clientTracking: false, perMessageDeflate: true });
app.ws('/', world.onClient.bind(world));
app.get(
  '/map/@:originX([\\-]?\\d+),:originZ([\\-]?\\d+)(,)?:radius([\\-]?\\d+)?',
  map.onRequest.bind(map)
);
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use((req, res) => res.status(404).end());
const server = app.listen(process.env.PORT || 8080, () => (
  console.log(`Listening on port: ${server.address().port}`)
));
