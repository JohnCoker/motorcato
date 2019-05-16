const express = require('express'),
      router = express.Router(),
      moment = require('moment'),
      escape = require('escape-html');

const ReportTitle = 'Report a Malfunction';

router.get('/report', function(req, res, next) {
  res.render('report', { title: ReportTitle });
});
router.post('/report', function(req, res, next) {
  res.render('report', { title: ReportTitle });
});

module.exports = router;
