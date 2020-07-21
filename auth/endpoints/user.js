const { body, param, validationResult } = require('express-validator');
const Location = require('../models/location');
const User = require('../models/user');

module.exports = (app) => {
  app.get(
    '/user',
    User.authenticate,
    (req, res) => {
      User.findById(req.user._id)
        .select('name')
        .then((user) => (
          res.json(user.getNewSession())
        ))
        .catch(() => (
          res.status(500).end()
        ));
    }
  );

  app.get(
    '/user/locations',
    User.authenticate,
    Location.list({ filter: 'session', pageSize: 100 })
  );

  app.get(
    '/user/skin',
    User.authenticate,
    (req, res) => {
      User
        .findById(req.user._id)
        .select('updatedAt')
        .then((user) => {
          const lastModified = user.updatedAt.toUTCString();
          if (req.get('if-modified-since') === lastModified) {
            return res.status(304).end();
          }
          return User
            .findById(user._id)
            .select('skin')
            .then(({ skin }) => (
              res
                .set('Cache-Control', 'public, must-revalidate')
                .set('Last-Modified', lastModified)
                .type('image/png')
                .send(skin)
            ));
        })
        .catch(() => (
          res.status(500).end()
        ));
    }
  );

  app.patch(
    '/user/password',
    User.authenticate,
    body('current')
      .not().isEmpty()
      .trim(),
    body('password')
      .not().isEmpty()
      .trim(),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      const { current, password } = req.body;
      User
        .findById(req.user._id)
        .select('password')
        .then((user) => (
          user
            .comparePassword(current)
            .then((isMatch) => {
              if (!isMatch) {
                return res.status(401).end();
              }
              user.password = password;
              return user
                .save()
                .then(() => (
                  res.status(200).end()
                ));
            })
        ))
        .catch(() => (
          res.status(401).end()
        ));
    }
  );

  app.patch(
    '/user',
    User.authenticate,
    body('name')
      .optional()
      .not().isEmpty()
      .isLength({ min: 1, max: 25 })
      .trim(),
    body('skin')
      .optional()
      .isBase64(),
    (req, res) => {
      const { name, skin } = req.body;
      if (!name && !skin) {
        res.status(422).end();
        return;
      }
      if (name) {
        req.user.name = name;
      }
      if (skin) {
        req.user.skin = Buffer.from(skin, 'base64');
      }
      req.user.save()
        .then(() => res.status(200).end())
        .catch(() => res.status(400).end());
    }
  );

  app.put(
    '/user',
    body('email')
      .isEmail()
      .normalizeEmail(),
    body('password')
      .not().isEmpty()
      .trim(),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      const { email, password } = req.body;
      User
        .findOne({ email })
        .select('name password')
        .then((user) => {
          if (!user) {
            return res.status(401).end();
          }
          return user
            .comparePassword(password)
            .then((isMatch) => {
              if (!isMatch) {
                return res.status(401).end();
              }
              return res.json(user.getNewSession());
            });
        })
        .catch(() => (
          res.status(401).end()
        ));
    }
  );

  app.post(
    '/users',
    body('email')
      .isEmail()
      .normalizeEmail(),
    body('name')
      .not().isEmpty()
      .isLength({ min: 1, max: 25 })
      .trim(),
    body('password')
      .not().isEmpty()
      .trim(),
    body('skin')
      .isBase64(),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      const user = new User({
        email: req.body.email,
        name: req.body.name,
        password: req.body.password,
        skin: Buffer.from(req.body.skin, 'base64'),
      });
      user.save()
        .then(() => res.json(user.getNewSession()))
        .catch(() => res.status(400).end());
    }
  );

  app.get(
    '/user/:user/locations',
    Location.list({ filter: 'user' })
  );

  app.get(
    '/user/:id/meta',
    param('id')
      .isMongoId(),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      User
        .findById(req.params.id)
        .select('name')
        .then((user) => {
          if (!user) {
            res.status(404).end();
            return;
          }
          res.json(user);
        })
        .catch(() => (
          res.status(500).end()
        ));
    }
  );

  app.get(
    '/user/:id/skin',
    param('id')
      .isMongoId(),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      User
        .findById(req.params.id)
        .select('updatedAt')
        .then((user) => {
          if (!user) {
            return res.status(404).end();
          }
          const lastModified = user.updatedAt.toUTCString();
          if (req.get('if-modified-since') === lastModified) {
            return res.status(304).end();
          }
          return User
            .findById(user._id)
            .select('skin')
            .then(({ skin }) => (
              res
                .set('Cache-Control', 'public, max-age=86400')
                .set('Last-Modified', lastModified)
                .type('image/png')
                .send(skin)
            ));
        })
        .catch(() => (
          res.status(500).end()
        ));
    }
  );
};
