const express = require('express'),
      router = express.Router(),
      moment = require('moment'),
      loadMfrNames = require('./util.js').loadMfrNames;

const ReportTitle = 'Report a Malfunction';

function reportProps() {
  let props = {
    title: 'Report a Malfunction',
    errors: []
  };
  return new Promise((resolve, reject) => {
    loadMfrNames().then(list => {
      props.manufacturers = list;
      resolve(props);
    }).catch(e => reject(e));
  });
}
router.get('/report', function(req, res, next) {
  reportProps().then(props => res.render('report', props))
               .catch(err => next(err));
  
});
router.post('/report', function(req, res, next) {
  reportProps().then(props => {
    res.render('report', props);
  }).catch(err => next(err));
});

module.exports = router;
