const express = require('express'),
      router = express.Router(),
      escape = require('escape-html'),
      MarkdownIt = require('markdown-it'),
      { LargeObjectManager } = require('pg-large-object'),
      originURL = require('./util.js').originURL,
      formatDateISO = require('./util.js').formatDateISO,
      formatDateLocal = require('./util.js').formatDateLocal;

router.get(['/', 'index.html'], function(req, res, next) {
  // load info on notifications
  req.pool.query('select * from notifications where not expired order by date desc', (err, q) => {
    if (err)
      return next(err);

    let props = {
      title: 'MESS Reports',
      notifications: []
    };
    q.rows.forEach(r => {
      let url;
      if (r.document_name != null)
        url = '/document/' + escape(r.document_name);
      else if (r.url != null)
        url = r.url;
      else
        url = '/notification/' + r.id;
      props.notifications.push({
        id: r.id,
        date_iso: formatDateISO(r.date),
        date_local: formatDateLocal(req, r.date),
        headline: r.headline,
        url: url,
      });
    });
    res.render('index', props);
  });
});

router.get('/notification/:id', function(req, res, next) {
  // load single notification
  if (req.params.id == null || !/^\d+$/.test(req.params.id))
    return next();
  req.pool.query('select * from notifications where id = $1', [req.params.id], (err, q) => {
    if (err)
      return next(err);
    if (q.rows.length != 1)
      return next();

    let row = q.rows[0];
    let body = row.body;
    if (row.body == null || row.body === '') {
      if (row.document_name != null)
        body = '<p><a href="/document/' + escape(row.document_name) + '">See this document</a></p>';
      else if (row.url != null)
        body = '<p><a href="' + escape(row.url) + '">See this document</a></p>';
      else
        body = '<p><i>(no content)</i></p>';
    } else {
      let md = new MarkdownIt({
        html: true,
        linkify: true
      });
      body = md.render(row.body);
    }
    res.render('notification', {
      title: row.headline,
      body: body
    });
  });
});

router.get('/document/:name', function(req, res, next) {
  if (req.params.name == null || req.params.name === '')
    return next();
  req.pool.connect((err, client, release) => {
    if (err)
      return next(err);

    const lom = new LargeObjectManager({ pg: client });
    client.query('begin', (err, tx) => {
      if (err) {
        release(err);
        return next(err);
      }

      client.query('select * from documents where filename = $1', [req.params.name], (err, q) => {
        if (err) {
          release(err);
          return next(err);
        }
        if (q.rows.length != 1) {
          release();
          return next();
        }
        const r = q.rows[0];

        lom.openAndReadableStream(r.content_oid, 2048 * 8, (err, size, stream) => {
          if (err) {
            release(err);
            return next(err);
          }
          res.type(r.content_type)
             .set('Content-Length', size);
          stream.on('readable', () => {
                  let b = stream.read();
                  if (b != null)
                    res.write(b);
                })
                .on('end', () => {
                  res.end();
                  client.query('commit', release);
                });
        });
      });
    });
  });
});

router.get(['/about', '/about.html' ], function(req, res, next) {
  res.render('about', {
    title: 'About This Site',
    apiURL: originURL(req) + '/api/1',
  });
});

module.exports = router;
