const moment = require('moment'),
      http = require('http'),
      xml2js = require('xml2js');

function isEmpty(v) {
  return v == null || v === '' || v.trim() === '';
}

function nonEmpty(v) {
  if (v == null)
    return;
  v = v.trim();
  if (v !== '')
    return v;
}

function integer(v) {
  if (v == null)
    return;
  v = v.trim();
  if (/^-?[1-9][0-9]*$/.test(v))
    return parseInt(v);
}

function posInteger(v) {
  if (v == null)
    return;
  v = v.trim();
  if (/^[1-9][0-9]*$/.test(v))
    return parseInt(v);
}

function number(v) {
  if (v == null)
    return;
  let n = parseFloat(v.trim());
  if (!isNaN(n) && isFinite(n))
    return n;
}

function posNumber(v) {
  if (v == null)
    return;
  let n = parseFloat(v.trim());
  if (!isNaN(n) && isFinite(n) && n >= 0.001)
    return n;
}

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

function parseDateISO(v) {
  if (v == null)
    return;
  let date = moment(v.trim(), 'YYYY-M-D', true);
  if (date != null && date.isValid())
    return date;
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
                  MfrList.sort();
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

function rowId(id) {
  if (id == null || !/^\d+$/.test(id))
    return -1;
  return id;
}

function formatSize(size) {
  if (typeof size != 'number' || !isFinite(size) || size < 0)
    return '';
  if (size >= 1024.5 * 1024)
    return (size / 1024 / 1024).toFixed() + 'Mb';
  if (size >= 1024.5)
    return (size / 1024).toFixed() + 'Kb';
  else
    return size.toFixed() + 'b';
}

function commonName(desig) {
  if (desig == null)
    return;
  desig = desig.trim();
  if (/^MicroMaxx/.test(desig))
    return desig;
  else if (m = /^\d*([a-z])([1-9][0-9]*).*$/i.exec(desig))
    return m[1].toUpperCase() + m[2];
  else if (m = /^(.*[^a-z])?([a-z])[ -]?([1-9][0-9]*).*$/i.exec(desig))
    return m[2].toUpperCase() + m[3];
}

module.exports = {
  isEmpty: isEmpty,
  nonEmpty: nonEmpty,
  integer: integer,
  posInteger: posInteger,
  posNumber: posNumber,
  quoteSqlStr: quoteSqlStr,
  searchURL: searchURL,
  parseDateISO: parseDateISO,
  formatDateISO: formatDateISO,
  formatDateLocal: formatDateLocal,
  loadMfrNames: loadMfrNames,
  originURL: originURL,
  rowId: rowId,
  formatSize: formatSize,
  commonName: commonName,
};
