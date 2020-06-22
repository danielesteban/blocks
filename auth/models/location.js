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
        .resize(512, 512)
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

module.exports = mongoose.model('Location', LocationSchema);
