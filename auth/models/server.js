const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const fetch = require('node-fetch');

const ServerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
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
    required: true,
  },
}, { timestamps: true });

ServerSchema.methods = {
  updateStatus() {
    const server = this;
    return fetch(`${server.url}status`)
      .then((res) => res.json())
      .then(({ name, version }) => {
        server.name = name;
        server.version = version;
        return server.save();
      })
      .catch((err) => {
        if (server.isNew || !server.verified) {
          throw err;
        }
        server.verified = false;
        return server
          .save()
          .then(() => {
            throw err;
          });
      });
  },
};

ServerSchema.statics = {
  createOrUpdate(doc) {
    const Server = this;
    return Server
      .findOne(doc)
      .then((server) => {
        if (server) {
          return server;
        }
        return new Server(doc);
      })
      .then((server) => (
        server.updateStatus()
      ));
  },
};

ServerSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Server', ServerSchema);
