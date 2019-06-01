const moment = require('moment'),
      http = require('http'),
      xml2js = require('xml2js');

function quoteSqlStr(v) {
  if (v == null)
    return 'null';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function searchURL(o) {
  let s = '/search';
  Object.keys(o).forEach((k, i) => {
    s += i == 0 ? '?' : '&';
    s += k;
    s += '=';
    s += encodeURIComponent(o[k]);
  });
  return s;
}

function formatDateISO(v) {
  if (v == null)
    return '';
  return moment(v).format('YYYY-MM-DD');
}

function formatDateLocal(req, v) {
  if (v == null)
    return '';
  return moment(v).format('ll');
}

let MfrList = [], MfrQueried;

function loadMfrNames() {
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
                  resolve(MfrList);
                });
              });
         });
      req.write('<metadata-request/>');
      req.end();
    } else {
      // use cached value
      resolve(MfrList);
    }
  });
}

function originURL(req) {
  let host = req.headers['X-Forwarded-Host'] || req.get('host') || 'localhost',
      protocol = /^localhost/.test(host) ? 'http' : 'https';
  return protocol + '://' + host;
}

module.exports = {
  quoteSqlStr: quoteSqlStr,
  searchURL: searchURL,
  formatDateISO: formatDateISO,
  formatDateLocal: formatDateLocal,
  loadMfrNames: loadMfrNames,
  originURL: originURL,
};
