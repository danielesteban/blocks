const {
  body,
  param,
  query,
  validationResult,
} = require('express-validator');
const multer = require('multer');
const Location = require('../models/location');
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
          .select('position server')
          .sort('-createdAt')
          .skip(page * pageSize)
          .limit(pageSize)
          .then((locations) => (
            res.json(locations)
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
    (req, res) => {
      if (
        !req.file
        || req.file.mimetype !== 'image/jpeg'
        || !validationResult(req).isEmpty()
      ) {
        res.status(422).end();
        return;
      }
      const location = new Location({
        photo: req.file.buffer,
        position: {
          x: req.body.positionX,
          y: req.body.positionY,
          z: req.body.positionZ,
        },
        server: req.body.server,
        user: req.user._id,
      });
      location.save()
        .then(() => res.json({
          _id: location._id,
          position: location.position,
          server: location.server,
        }))
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
