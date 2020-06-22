const {
  body,
  param,
  query,
  validationResult,
} = require('express-validator');
const multer = require('multer');
const Location = require('../models/location');
const Server = require('../models/server');
const User = require('../models/user');

module.exports = (app) => {
  const upload = multer({
    limits: { fileSize: 512000 },
    storage: multer.memoryStorage(),
  });

  app.get(
    '/locations',
    query('page')
      .optional()
      .isInt()
      .toInt(),
    query('filter')
      .optional()
      .isIn(['latest', 'user']),
    (req, res) => {
      const page = req.query.page || 0;
      const pageSize = 10;
      const filter = req.query.filter || 'latest';
      const list = () => (
        Location
          .find(filter === 'user' ? { user: req.user._id } : {})
          .select(`${filter !== 'user' ? '-_id ' : ''}position rotation server`)
          .populate('server', '-_id url')
          .sort('-createdAt')
          .skip(page * pageSize)
          .limit(pageSize)
          .then((locations) => (
            res.json(locations.map((location) => ({
              ...location._doc,
              server: location.server.url,
            })))
          ))
          .catch(() => res.status(500).end())
      );
      if (filter === 'user') {
        User.authenticate(req, res, list);
        return;
      }
      list();
    }
  );

  app.post(
    '/locations',
    User.authenticate,
    upload.single('photo'),
    body('server')
      .isURL({ protocols: ['https'] }),
    body('positionX')
      .isInt()
      .toInt(),
    body('positionY')
      .isInt()
      .toInt(),
    body('positionZ')
      .isInt()
      .toInt(),
    body('rotation')
      .isFloat()
      .toFloat(),
    (req, res) => {
      if (
        !req.file
        || req.file.mimetype !== 'image/jpeg'
        || !validationResult(req).isEmpty()
      ) {
        res.status(422).end();
        return;
      }
      Server
        .findOrCreate({ url: req.body.server })
        .then((server) => {
          const location = new Location({
            photo: req.file.buffer,
            position: {
              x: req.body.positionX,
              y: req.body.positionY,
              z: req.body.positionZ,
            },
            rotation: req.body.rotation,
            server: server._id,
            user: req.user._id,
          });
          return location
            .save()
            .then(() => (
              location
                .populate('server', '-_id url')
                .execPopulate()
                .then(() => (
                  res.json({
                    _id: location._id,
                    position: location.position,
                    rotation: location.rotation,
                    server: location.server.url,
                  })
                ))
            ));
        })
        .catch(() => res.status(400).end());
    }
  );

  app.delete(
    '/location/:id',
    User.authenticate,
    param('id')
      .isMongoId(),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      Location
        .deleteOne({
          _id: req.params.id,
          user: req.user._id,
        })
        .then(() => res.status(200).end())
        .catch(() => res.status(400).end());
    }
  );

  app.get(
    '/location/:id',
    param('id')
      .isMongoId(),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      Location.findById(req.params.id)
        .select('photo')
        .then(({ photo }) => (
          res.type('image/jpeg').end(photo)
        ))
        .catch(() => (
          res.status(500).end()
        ));
    }
  );
};
