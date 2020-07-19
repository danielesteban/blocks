const { body, param, validationResult } = require('express-validator');
const multer = require('multer');
const Location = require('../models/location');
const Server = require('../models/server');
const User = require('../models/user');

module.exports = (app) => {
  const upload = multer({
    limits: { fileSize: 1048576 },
    storage: multer.memoryStorage(),
  });

  app.get(
    '/locations',
    Location.list({ filter: 'latest' })
  );

  app.post(
    '/locations',
    User.authenticate,
    upload.single('photo'),
    body('server')
      .isMongoId(),
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
        .findById(req.body.server)
        .select('_id')
        .then((server) => {
          if (!server) {
            throw new Error();
          }
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
              res.json({
                _id: location._id,
                position: location.position,
                rotation: location.rotation,
                server: location.server,
              })
            ));
        })
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
      Location
        .findById(req.params.id)
        .select('createdAt position server user')
        .populate('server', 'name')
        .populate('user', 'name')
        .then((location) => {
          if (!location) {
            res.status(404).end();
            return;
          }
          const {
            _id,
            createdAt,
            position: { x, y, z },
            server: { name: server },
            user: { name: user },
          } = location;
          const leadingZero = (v) => (v.length < 2 ? `0${v}` : v);
          const date = `${createdAt.getFullYear()}/${leadingZero(`${createdAt.getMonth() + 1}`)}/${leadingZero(`${createdAt.getDate()}`)}`;
          res
            .set('Cache-Control', 'public, max-age=31536000')
            .type('text/html')
            .send([
              '<html>',
              '<head>',
              '<meta charset="utf-8">',
              `<meta property="og:url" content="${app.get('PUBLIC_URL')}location/${_id}" />`,
              `<meta property="og:title" content=${JSON.stringify(`x:${x} y:${y} z:${z} - ${server}`)} />`,
              `<meta property="og:description" content=${JSON.stringify(`${user} - ${date}`)} />`,
              `<meta property="og:image" content="${app.get('PUBLIC_URL')}location/${_id}/photo" />`,
              '<meta property="og:image:type" content="image/jpeg" />',
              '<meta property="og:image:width" content="1280" />',
              '<meta property="og:image:height" content="720" />',
              '<meta property="twitter:card" content="summary_large_image">',
              '<script>',
              `window.location = ${JSON.stringify(`${app.get('CLIENT_URL')}#/location:${_id}`)};`,
              '</script>',
              '</head>',
              '</html>',
            ].join('\n'));
        })
        .catch(() => (
          res.status(500).end()
        ));
    }
  );

  app.get(
    '/location/:id/meta',
    param('id')
      .isMongoId(),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      Location
        .findById(req.params.id)
        .select('createdAt position rotation server user')
        .populate('server', 'name url')
        .populate('user', 'name')
        .then((location) => {
          if (!location) {
            res.status(404).end();
            return;
          }
          res.json(location);
        })
        .catch(() => (
          res.status(500).end()
        ));
    }
  );

  app.get(
    '/location/:id/photo',
    param('id')
      .isMongoId(),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      Location
        .findById(req.params.id)
        .select('photo')
        .then((location) => {
          if (!location) {
            res.status(404).end();
            return;
          }
          res
            .set('Cache-Control', 'public, max-age=31536000')
            .type('image/jpeg')
            .send(location.photo);
        })
        .catch(() => (
          res.status(500).end()
        ));
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
};
