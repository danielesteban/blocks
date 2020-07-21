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
          {
            available: true,
            verified: true,
          },
          {
            limit: 25,
            page,
            select: 'name url',
            sort: '-updatedAt',
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
      .isURL({ protocols: ['https'] })
      .custom((url) => {
        url = new URL(url);
        return (
          !url.hash && !url.query
          && url.pathname.substr(url.pathname.length - 1) === '/'
        );
      }),
    (req, res) => {
      if (!validationResult(req).isEmpty()) {
        res.status(422).end();
        return;
      }
      Server
        .createOrUpdate({ url: req.body.url })
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
          const { _id, name, url } = server;
          res
            .set('Cache-Control', 'public, max-age=86400')
            .type('text/html')
            .send([
              '<html>',
              '<head>',
              '<meta charset="utf-8">',
              `<meta property="og:url" content="${app.get('PUBLIC_URL')}server/${_id}" />`,
              `<meta property="og:title" content=${JSON.stringify(`${name}`)} />`,
              `<meta property="og:description" content="${url}" />`,
              `<meta property="og:image" content="${url}map" />`,
              '<meta property="og:image:type" content="image/png" />',
              '<meta property="og:image:width" content="544" />',
              '<meta property="og:image:height" content="544" />',
              '<meta property="twitter:card" content="summary_large_image">',
              '<script>',
              `window.location = ${JSON.stringify(`${app.get('CLIENT_URL')}#/server:${encodeURIComponent(url)}`)};`,
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
    '/server/:id/meta',
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
