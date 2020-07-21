const { param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
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
        .jpeg({ quality: 90 })
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
    pageSize = 50,
  }) {
    const Location = this;
    return [
      ...(filter === 'server' ? [
        param('server')
          .isMongoId(),
      ] : []),
      ...(filter === 'user' ? [
        param('user')
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
        const page = Math.max(req.query.page || 1, 1);
        const selector = {};
        switch (filter) {
          case 'session':
            selector.user = req.user._id;
            break;
          case 'server':
            selector.server = req.params.server;
            break;
          case 'user':
            selector.user = req.params.user;
            break;
          default:
            break;
        }
        Location
          .paginate(
            selector,
            {
              limit: pageSize,
              page,
              sort: '-createdAt',
              ...(filter === 'session' ? ({
                select: '_id',
              }) : ({
                populate: [
                  { path: 'server', select: 'name' },
                  { path: 'user', select: 'name' },
                ],
                select: [
                  'createdAt',
                  'position',
                  'rotation',
                ],
              })),
            }
          )
          .then(({ docs, totalPages }) => (
            res
              .set('Access-Control-Expose-Headers', 'X-Total-Pages')
              .set('X-Total-Pages', totalPages)
              .json(docs)
          ))
          .catch(() => res.status(500).end());
      },
    ];
  },
};

LocationSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Location', LocationSchema);
