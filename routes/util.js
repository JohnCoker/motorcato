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

const DefaultMfrs = [
  'AeroTech',
  'Animal Motor Works',
  'Cesaroni Technology',
  'Ellis Mountain',
  'Estes Industries',
  'Loki Research',
  'Quest Aerospace',
  'Southern Cross Rocketry',
];

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
                  if (err) {
                    MfrList = DefaultMfrs;
                  } else {
                    let mfrs = data['metadata-response'].manufacturers;
                    if (mfrs && mfrs.length == 1 && mfrs[0].manufacturer.length > 0)
                      MfrList = mfrs[0].manufacturer.map(o => o._);
                  }
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

const SearchCols = {};
const FailureCols = [];
[
  {
    col: "id",
    type: "int",
    id: true,
  },
  {
    col: "old_id",
    type: "int",
    id: true,
  },
  {
    col: "manufacturer",
    aliases: ["mfr"],
  },
  {
    col: "designation",
    aliases: ["enginecode"],
  },
  {
    col: "common_name",
    aliases: ["motor", "name"],
  },
  {
    col: "motor_type",
    aliases: ["type"],
  },
  {
    col: "serial_no",
    aliases: ["code"],
  },
  {
    col: "failure_date",
    aliases: ["date"],
    type: "date",
  },
  {
    col: "fail_nozzle_blown",
    aliases: ["nozzle_blown"],
    type: "bool",
  },
  {
    col: "fail_ejection_blown",
    aliases: ["ejection_blown"],
    type: "bool",
  },
  {
    col: "fail_casing_split",
    aliases: ["casing_split"],
    type: "bool",
  },
  {
    col: "fail_propellant_ejected",
    aliases: ["propellant_ejected"],
    type: "bool",
  },
  {
    col: "fail_burn_through",
    aliases: ["burn_through"],
    type: "bool",
  },
  {
    col: "fail_no_ejection",
    aliases: ["no_ejection"],
    type: "bool",
  },
  {
    col: "fail_bad_delay",
    aliases: ["bad_delay"],
    type: "bool",
  },
  {
    col: "fail_other",
    aliases: ["other"],
    type: "bool",
  },
  {
    col: "status",
  },
].forEach(info => {
  SearchCols[info.col] = info;
  if (info.aliases)
    info.aliases.forEach(alias => SearchCols[info.col] = info);
  if (/^fail_/.test(info.col))
    FailureCols.push(info);
});
(function() {
  let info = {
    col: "fail_unknown",
    type: "bool",
    sql: v => {
      let sql = "(";
      FailureCols.forEach((info, i) => {
        if (i > 0)
          sql += " and ";
        sql += " not " + info.col;
      });
      sql += ")";
      return sql;
    }
  };
  SearchCols[info.col] = info;

  info = {
    col: "name",
    type: "bool",
    sql: v => {
      if (v == null || v === '')
        return;
      if (v == 'null')
        return 'common_name is null';
      else
        return '(common_name = upper(' + quoteSqlStr(v) + ') or designation ilike ' + quoteSqlStr('%' + v + '%') + ')';
    }
  };
  SearchCols[info.col] = info;
})();

function searchQuery(req, res, params) {
  let keys = [],
      criteria = { failure_date_compare: '>=' },
      comparisons = [],
      byId = false,
      query;

  if (params != null) {
    function compareOp(key) {
      let op = params[key + '_compare'];
      if (op == null || op === '' || !/^[<>]?=?$/.test(op))
        op = "=";
      return op;
    }
    keys = Object.keys(params);
    keys.forEach(key => {
      let info = SearchCols[key],
          value = params[key];
      if (info) {
        let compare;
        if (info.sql) {
          let sql = info.sql(value);
          if (sql) {
            comparisons.push(sql);
            criteria[key] = value;
          }
        } else if (value == 'null') {
          comparisons.push(info.col + " is null");
          criteria[key] = 'null';
        } else if (info.type == 'date') {
          value = moment(value, 'YYYY-M-D', true);
          if (value.isValid()) {
            compare = compareOp(key);
            comparisons.push(info.col + " " + compare + " '" + value.format("YYYY-MM-DD") + "'");
            criteria[key] = value;
            criteria[key + '_compare'] = compare;
          } else
            value = null;
        } else if (info.type == 'int') {
          value = parseInt(value);
          if (!isNaN(value)) {
            compare = compareOp(key);
            comparisons.push(info.col + " " + compare + " " + value.toFixed());
            criteria[key] = value;
            criteria[key + '_compare'] = compare;
          } else
            value = null;
        } else if (info.type == 'bool') {
          if (value === 'false')
            comparisons.push("not " + info.col);
          else {
            value = true;
            comparisons.push(info.col);
            criteria[key] = true;
          }
        } else if (value != null && value !== '') {
          comparisons.push(info.col + " = " + quoteSqlStr(value));
          criteria[key] = value;
        }
        if (info.id)
          byId = true;
        if (value != null && value !== '') {
          if (query == null)
            query = '?';
          else
            query += '&';
          let text = value;
          if (info.type == 'date')
            text = formatDateISO(value);
          query += key + '=' + encodeURIComponent(text);
          if (compare != null)
            query += '&' + key + '_compare=' + encodeURIComponent(compare);
        }
      }
    });
  }

  let result = { SearchCols, FailureCols, criteria, query, comparisons };
  if (comparisons.length > 0) {
    let fails = comparisons.filter(sql => /^fail_/.test(sql));
    if (fails.length > 1) {
      comparisons = comparisons.filter(sql => !/^fail_/.test(sql));
      comparisons.push("(" + fails.join(" or ") + ")");
    }
    if (!byId && keys.indexOf('status') < 0)
      comparisons.push("status != 'rejected'");

    result.where = "\n where " + comparisons.join("\n       and ");
  }
  return result;
}

module.exports = {
  isEmpty,
  nonEmpty,
  integer,
  posInteger,
  posNumber,
  quoteSqlStr,
  searchURL,
  parseDateISO,
  formatDateISO,
  formatDateLocal,
  loadMfrNames,
  originURL,
  rowId,
  formatSize,
  commonName,
  searchQuery,
};
