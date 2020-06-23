const mongoose = require('mongoose');
const fetch = require('node-fetch');

const ServerSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  url: {
    type: String,
    lowercase: true,
    index: true,
    required: true,
    unique: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  version: {
    type: String,
  },
}, { timestamps: true });

ServerSchema.pre('save', function onSave(next) {
  const server = this;
  const promises = [];
  if (server.isModified('url')) {
    promises.push(
      fetch(`${server.url}status`)
        .then((res) => res.json())
        .then(({ name, version }) => {
          server.name = name;
          server.version = version;
          next();
        })
    );
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
