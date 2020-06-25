const { param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const sharp = require('sharp');

const LocationSchema = new mongoose.Schema({
  photo: {
    type: Buffer,
    required: true,
  },
  position: {
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    z: {
      type: Number,
      required: true,
    },
  },
  rotation: {
    type: Number,
    required: true,
  },
  server: {
    type: mongoose.Types.ObjectId,
    ref: 'Server',
    index: true,
    required: true,
  },
  user: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true,
  },
}, { timestamps: true });

LocationSchema.pre('save', function onSave(next) {
  const location = this;
  const promises = [];
  if (location.isModified('photo')) {
    promises.push(
      sharp(location.photo)
        .resize(1280, 720)
        .jpeg()
        .toBuffer()
        .then((photo) => {
          location.photo = photo;
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

LocationSchema.statics = {
  list({
    filter = 'latest',
    pageSize = 10,
  }) {
    const Location = this;
    return [
      ...(filter === 'server' ? [
        param('server')
          .isMongoId(),
      ] : []),
      query('page')
        .optional()
        .isInt()
        .toInt(),
      (req, res) => {
        if (!validationResult(req).isEmpty()) {
          res.status(422).end();
          return;
        }
        const page = req.query.page || 0;
        const selector = {};
        switch (filter) {
          case 'server':
            selector.server = req.params.server;
            break;
          case 'user':
            selector.user = req.user._id;
            break;
          default:
            break;
        }
        Location
          .find(selector)
          .select([
            'position',
            'rotation',
            ...(filter !== 'server' ? ['server'] : []),
            ...(filter !== 'user' ? ['user'] : []),
          ])
          .populate('server', 'name')
          .populate('user', 'name')
          .sort('-createdAt')
          .skip(page * pageSize)
          .limit(pageSize)
          .then((locations) => (
            res.json(locations)
          ))
          .catch(() => res.status(500).end());
      },
    ];
  },
};

module.exports = mongoose.model('Location', LocationSchema);
