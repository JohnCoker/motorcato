const express = require('express'),
      router = express.Router(),
      moment = require('moment'),
      escape = require('escape-html'),
      MarkdownIt = require('markdown-it');

router.get(['/', 'index.html'], function(req, res, next) {
  // load info on notifications
  req.pool.query('select id, date, url, headline from notifications where not expired order by date desc', (err, q) => {
    if (err)
      return next(err);

    let props = {
      title: 'MESS Reports',
      notifications: []
    };
    q.rows.forEach(r => {
      let url = r.url;
      if (url == null)
        url = '/notification/' + r.id;
      props.notifications.push({
        id: r.id,
        date: r.date,
        dateStr: moment(r.date).format('MMM D, YYYY'),
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
      if (row.url != null)
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

module.exports = router;
