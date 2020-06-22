const mongoose = require('mongoose');
const WebSocket = require('ws');

const ServerSchema = new mongoose.Schema({
  url: {
    type: String,
    lowercase: true,
    index: true,
    required: true,
    unique: true,
  },
}, { timestamps: true });

ServerSchema.pre('save', function onSave(next) {
  const server = this;
  const promises = [];
  if (server.isModified('url')) {
    promises.push(new Promise((resolve, reject) => {
      const url = new URL(server.url);
      url.protocol = url.protocol.replace(/http/, 'ws');
      const socket = new WebSocket(url.toString());
      socket.on('error', (err) => {
        socket.terminate();
        reject(err);
      });
      socket.on('open', () => {
        socket.terminate();
        resolve();
      });
    }));
  }
  if (!promises.length) {
    return next();
  }
  return Promise
    .all(promises)
    .then(() => next())
    .catch(next);
});

ServerSchema.statics = {
  findOrCreate(doc) {
    const Server = this;
    return Server
      .findOne(doc)
      .then((server) => {
        if (server) {
          return server;
        }
        server = new Server(doc);
        return server.save();
      });
  },
};

module.exports = mongoose.model('Server', ServerSchema);
