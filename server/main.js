const compression = require('compression');
const express = require('express');
const expressWS = require('express-ws');
const helmet = require('helmet');
const path = require('path');
const World = require('./world');

const world = new World({
  maxClients: process.env.MAX_CLIENTS ? parseInt(process.env.MAX_CLIENTS, 10) : 16,
  seed: process.env.SEED ? parseInt(process.env.SEED, 10) : undefined,
  preload: process.env.PRELOAD ? parseInt(process.env.PRELOAD, 10) : undefined,
});

const app = express();
app.use(helmet());
app.use(compression());
expressWS(app, null, { clientTracking: false, perMessageDeflate: true });
app.use(express.static(path.join(__dirname, '..', 'client')));
app.ws('/', world.onClient.bind(world));
app.use((req, res) => res.status(404).end());
const server = app.listen(process.env.PORT || 8080, () => (
  console.log(`Listening on port: ${server.address().port}`)
));
