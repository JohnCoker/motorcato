const express = require('express'),
      router = express.Router(),
      moment = require('moment'),
      escape = require('escape-html'),
      http = require('http'),
      xml2js = require('xml2js');

const ReportTitle = 'Report a Malfunction';

let MfrList = [], MfrQueried;

function reportProps() {
  let props = {
    title: 'Report a Malfunction',
    errors: []
  };
  function done() {
    props.manufacturers = MfrList;
    return props;
  }
  return new Promise((resolve, reject) => {
    let now = new Date();
    if (MfrQueried == null || MfrQueried.getTime() + (24*60*60*1000) < now.getTime()) {
      let req = http.request({
        host: 'www.thrustcurve.org',
        port: 80,
        path: '/servlets/metadata',
        method: 'POST'
      });
      req.on('error', err => reject(err))
         .on('response', res => {
           res.setEncoding('utf8');
           let body = '';
           res.on('error', err => reject(err))
              .on('data', chunk => body += chunk)
              .on('end', () => {
                xml2js.parseString(body, (err, data) => {
                  if (err)
                    return reject(err);

                  let mfrs = data['metadata-response'].manufacturers;
                  if (mfrs && mfrs.length == 1 && mfrs[0].manufacturer.length > 0)
                    MfrList = mfrs[0].manufacturer.map(o => o._);
                  MfrQueried = now;
                  resolve(done());
                });
              });
         });
      req.write('<metadata-request/>');
      req.end();
    } else {
      // use cached value
      resolve(done());
    }
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
