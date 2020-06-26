const {
  body,
  param,
  query,
  validationResult,
} = require('express-validator');
const Location = require('../models/location');
const Server = require('../models/server');

module.exports = (app) => {
  app.get(
    '/servers',
    query('page')
      .optional()
      .isInt({ min: 1 })
      .toInt(),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      const page = Math.max(req.query.page || 1, 1);
      Server
        .paginate(
          { verified: true },
          {
            limit: 10,
            page,
            select: 'name url',
            sort: '-createdAt',
          }
        )
        .then(({ docs, totalPages }) => (
          res
            .set('Access-Control-Expose-Headers', 'X-Total-Pages')
            .set('X-Total-Pages', totalPages)
            .json(docs)
        ))
        .catch(() => res.status(400).end());
    }
  );

  app.put(
    '/server',
    body('url')
      .isURL({ protocols: ['https'] }),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      Server
        .findOrCreate({ url: req.body.url })
        .then((server) => {
          server.updatedAt = new Date();
          return server.save();
        })
        .then((server) => (
          res.json(server._id)
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
        .select('name url')
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
