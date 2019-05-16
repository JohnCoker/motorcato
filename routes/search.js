const express = require('express'),
      router = express.Router(),
      moment = require('moment'),
      escape = require('escape-html');

const SearchTitle = 'Search Reports';

router.get('/search', function(req, res, next) {
  res.render('search', { title: SearchTitle });
});
router.post('/search', function(req, res, next) {
  res.render('search', { title: SearchTitle });
});

module.exports = router;
