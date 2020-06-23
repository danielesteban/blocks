const {
  body,
  param,
  validationResult,
} = require('express-validator');
const multer = require('multer');
const Location = require('../models/location');
const Server = require('../models/server');
const User = require('../models/user');

const host = process.env.HOST || 'https://blocks.gatunes.com/auth/';
const client = process.env.CLIENT || 'https://blocks.gatunes.com/';

module.exports = (app) => {
  const upload = multer({
    limits: { fileSize: 512000 },
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
              location
                .then(() => (
                  res.json({
                    _id: location._id,
                    position: location.position,
                    rotation: location.rotation,
                    server: location.server,
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
      Location
        .findById(req.params.id)
        .select('position server')
        .populate('server', 'name url')
        .then((location) => {
          if (!location) {
            res.status(404).end();
            return;
          }
          const { _id, position: { x, y, z }, server: { _id: server, name } } = location;
          const redirect = (
            `${client}#/server:${server}/x:${x}/y:${y}/z:${z}`
          );
          res
            .set('Cache-Control', 'public, max-age=15552000')
            .type('text/html')
            .send([
              '<html>',
              '<head>',
              `<meta property="og:url" content="${host}location/${_id}" />`,
              `<meta property="og:title" content=${JSON.stringify(name)} />`,
              `<meta property="og:description" content="X:${x} - Y:${y} - Z:${z}" />`,
              `<meta property="og:image" content="${host}location/${_id}/photo" />`,
              '<script>',
              `window.location = ${JSON.stringify(redirect)};`,
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
            .set('Cache-Control', 'public, max-age=15552000')
            .type('image/jpeg')
            .send(location.photo);
        })
        .catch(() => (
          res.status(500).end()
        ));
    }
  );
};
