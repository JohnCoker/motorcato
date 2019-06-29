const express = require('express'),
      router = express.Router(),
      quoteSqlStr = require('./util.js').quoteSqlStr,
      formatDateISO = require('./util.js').formatDateISO,
      searchURL = require('./util.js').searchURL;

function envelope(req, res) {
  let id = req.body && req.body.id || req.query && req.query.id;
  let obj = {
    "jsonrpc": "2.0",
  };
  if (id != null)
    obj.id = id;
  else
    obj.id = null;
  return obj;
}

// https://www.jsonrpc.org/specification#error_object
const ParseError = -32700;
const InvalidRequest = -32600;
const InvalidMethod = -32601;
const InvalidParams = -32602;
const ServerError = -32000;

function sendError(req, res, params, code, message) {
  let obj = envelope(req, res, params);
  if (code == null)
    code = InvalidParams;
  if (message == null)
    message = 'Invalid parameters.';
  obj.error = {
    code: code,
    message: message,
  };
  res.status(400)
     .type('application/json')
     .end(JSON.stringify(obj));
}

function sendResult(req, res, params, result) {
  let obj = envelope(req, res, params);
  if (result)
    obj.result = result;
  res.type('application/json')
     .end(JSON.stringify(obj));
}

function readBody(req, res, next, handler) {
  if (req.headers['content-type'] != 'application/json')
    return sendError(req, res, null, ParseError, "Request body must be JSON RPC 2.0 (wrong Content-Type).");
  if (req.body == null || req.body.jsonrpc !== '2.0')
    return sendError(req, res, null, InvalidRequest, "Not a JSON RPC 2.0 request (invalid version).");
  handler(req, res, req.body.method, req.body.params || {});
}

router.use(express.json());

/*
 * /api/1/manufacturers
 * (no params)
 */
function manufacturers(req, res, method, params) {
  let select = ("select manufacturer, count(*), max(failure_date) as failure_date from reports" +
                " where not rejected" +
                " group by 1" +
                " order by 1");
  req.pool.query(select, (err, q) => {
    if (err)
      return error(req, res, params, ServerError, 'Unable to query database.');

    let row = q.rows[0];
    let result = {
      count: q.rows.length,
      manufacturers: [],
    }
    q.rows.forEach(row => {
      let info = {
        name: row.manufacturer,
        failureCount: row.count,
      }
      if (row.failure_date != null)
        info.last_failure = formatDateISO(row.failure_date);
      row.searchURL = searchURL({ manufacturer: info.name });
      result.manufacturers.push(info);
    });
    sendResult(req, res, params, result);
  });
}

router.get('/manufacturers', function(req, res, next) {
  manufacturers(req, res, undefined, req.query);
});
router.post('/manufacturers', function(req, res, next) {
  readBody(req, res, next, manufacturers);
});

/*
 * /api/1/motor
 *
 * - manufacturer: full manufacturer name ("AeroTech")
 * - motor: motor common name ("G80")
 */
function motor(req, res, method, params) {
  params = params || {};
  let mfr = params.manufacturer;
  let name = params.motor;
  if (mfr == null || mfr === '')
    return sendError(req, res, params, InvalidParams, 'Missing "manufacturer" name param.');
  if (name == null || name === '')
    return sendError(req, res, params, InvalidParams, 'Missing "motor" name param.');

  let select = ("select count(*), max(failure_date) as failure_date from reports" +
                " where manufacturer = " + quoteSqlStr(mfr) + " and common_name = " + quoteSqlStr(name) +
                " and not rejected");
  req.pool.query(select, (err, q) => {
    if (err)
      return error(req, res, params, ServerError, 'Unable to query database.');

    let row = q.rows[0];
    let result = {
      manufacturer: mfr,
      motor: name,
      failureCount: row.count,
    };
    if (row.failure_date != null)
      result.last_failure = formatDateISO(row.failure_date);
    result.searchURL = searchURL({ manufacturer: mfr, name: name });
    sendResult(req, res, params, result);
  });
}

router.get('/motor', function(req, res, next) {
  motor(req, res, undefined, req.query);
});
router.post('/motor', function(req, res, next) {
  readBody(req, res, next, motor);
});

/*
 * /api/1
 * method must be specified, params according to method
 */
function dispatch(req, res, method, params) {
  if (method == null || method === '')
    sendError(req, res, params, InvalidMethod, 'JSON RPC method must be specified.');
  else if (method == 'manufacturers')
    manufacturers(req, res, method, params);
  else if (method == 'motor')
    motor(req, res, method, params);
  else
    sendError(req, res, params, InvalidMethod, 'JSON RPC method unknown.');
}

router.get('*', function(req, res, next) {
  dispatch(req, res, req.query.method, req.query);
});
router.post('*', function(req, res, next) {
  readBody(req, res, next, dispatch);
});

module.exports = router;
