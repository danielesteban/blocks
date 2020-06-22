const { body, validationResult } = require('express-validator');
const multer = require('multer');
const User = require('../models/user');

module.exports = (app) => {
  const upload = multer({
    limits: { fileSize: 102400 },
    storage: multer.memoryStorage(),
  });

  app.get(
    '/user',
    User.authenticate,
    (req, res) => {
      res.json(req.user.getNewSession());
    }
  );

  app.get(
    '/user/skin',
    User.authenticate,
    (req, res) => {
      User.findById(req.user._id)
        .select('skin')
        .then(({ skin }) => (
          res.type('image/png').end(skin)
        ))
        .catch(() => (
          res.status(500).end()
        ));
    }
  );

  app.patch(
    '/user/skin',
    User.authenticate,
    upload.single('skin'),
    (req, res) => {
      if (
        !req.file
        || req.file.mimetype !== 'image/png'
      ) {
        res.status(422).end();
        return;
      }
      req.user.skin = req.file.buffer;
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
    upload.single('skin'),
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
    (req, res) => {
      if (
        !req.file
        || req.file.mimetype !== 'image/png'
        || !validationResult(req).isEmpty()
      ) {
        res.status(422).end();
        return;
      }
      const user = new User({
        email: req.body.email,
        name: req.body.name,
        password: req.body.password,
        skin: req.file.buffer,
      });
      user.save()
        .then(() => res.json(user.getNewSession()))
        .catch(() => res.status(400).end());
    }
  );
};
