const { param, query, validationResult } = require('express-validator');
const Location = require('../models/location');
const Server = require('../models/server');

module.exports = (app) => {
  app.get(
    '/servers',
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
      const pageSize = 10;
      Server
        .find()
        .select('url')
        .sort('-createdAt')
        .skip(page * pageSize)
        .limit(pageSize)
        .then((servers) => (
          res.json(servers)
        ))
        .catch(() => res.status(400).end());
    }
  );

  app.get(
    '/server/:id',
    param('id')
      .isMongoId(),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      Server
        .findById(req.params.id)
        .select('url')
        .then((server) => {
          if (!server) {
            res.status(404).end();
            return;
          }
          res.json(server);
        })
        .catch(() => res.status(400).end());
    }
  );

  app.get(
    '/server/:server/locations',
    Location.list({ filter: 'server' })
  );
};
