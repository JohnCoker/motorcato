const moment = require('moment');

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

module.exports = {
  searchURL: searchURL,
  formatDateISO: formatDateISO,
  formatDateLocal: formatDateLocal,
};
