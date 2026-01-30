const express = require('express'),
      router = express.Router(),
      quoteSqlStr = require('./util.js').quoteSqlStr,
      formatDateISO = require('./util.js').formatDateISO,
      searchURL = require('./util.js').searchURL;

function envelope(req, res) {
  let obj = {
    "jsonrpc": "2.0",
    "id": (req.body && req.body.id) ?? (req.query && req.query.id) ?? null,
  };
  return obj;
}

const ORIGIN = 'https://www.motorcato.org';

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
                " where status != 'rejected'" +
                " group by 1" +
                " order by 1");
  req.pool.query(select, (err, q) => {
    if (err)
      return error(req, res, params, ServerError, 'Unable to query database.');

    let result = {
      count: q.rows.length,
      manufacturers: [],
    }
    q.rows.forEach(row => {
      let info = {
        name: row.manufacturer,
        failureCount: toCount(row.count),
      }
      if (row.failure_date != null)
        info.lastFailure = formatDateISO(row.failure_date);
      info.searchURL = searchURL({ manufacturer: info.name });
      info.source_url = ORIGIN + info.searchURL;
      result.manufacturers.push(info);
    });
    result.source_url = ORIGIN + '/';
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
 * /api/1/motors
 *
 * - manufacturer: full manufacturer name ("AeroTech")
 */
function motors(req, res, method, params) {
  params = params || {};
  let mfr = params.manufacturer;
  if (mfr == null || mfr === '')
    return sendError(req, res, params, InvalidParams, 'Missing "manufacturer" name param.');

  let select = ("select common_name, count(*) as failure_count, max(failure_date) as last_failure from reports" +
                " where manufacturer = " + quoteSqlStr(mfr) +
                " and status != 'rejected'" +
                " group by common_name");
  req.pool.query(select, (err, q) => {
    if (err)
      return error(req, res, params, ServerError, 'Unable to query database.');

    const result = {
      count: q.rows.length,
      motors: [],
    };
    q.rows.forEach(row => {
      const name = row.common_name;
      let info = {
        manufacturer: mfr,
        name,
        failureCount: toCount(row.failure_count),
      };
      if (row.last_failure != null)
        info.lastFailure = formatDateISO(row.last_failure);
      info.searchURL = searchURL({ manufacturer: mfr, name });
      info.source_url = ORIGIN + info.searchURL;
      result.motors.push(info);
    });
    result.searchURL = searchURL({ manufacturer: mfr });
    result.source_url = ORIGIN + result.searchURL;
    sendResult(req, res, params, result);
  });
}

router.get('/motors', function(req, res, next) {
  motors(req, res, undefined, req.query);
});
router.post('/motors', function(req, res, next) {
  readBody(req, res, next, motors);
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

  let select = ("select count(*), max(failure_date) as last_failure from reports" +
                " where manufacturer = " + quoteSqlStr(mfr) + " and common_name = " + quoteSqlStr(name) +
                " and status != 'rejected'");
  req.pool.query(select, (err, q) => {
    if (err)
      return error(req, res, params, ServerError, 'Unable to query database.');

    let row = q.rows[0];
    let result = {
      manufacturer: mfr,
      motor: name,
      failureCount: toCount(row.count),
    };
    if (row.last_failure != null)
      result.lastFailure = formatDateISO(row.last_failure);
    result.searchURL = searchURL({ manufacturer: mfr, name: name });
    result.source_url = ORIGIN + result.searchURL;
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
  else if (method == 'motors')
    motors(req, res, method, params);
  else if (method == 'motor')
    motor(req, res, method, params);
  else
    sendError(req, res, params, InvalidMethod,
              'JSON RPC method unknown (expected manufacturers, motors, or motor).');
}

router.get('*', function(req, res, next) {
  dispatch(req, res, req.query.method, req.query);
});
router.post('*', function(req, res, next) {
  readBody(req, res, next, dispatch);
});

function toCount(c) {
  if (typeof c == 'bigint')
    return c;
  if (typeof c == 'string')
    c = parseInt(c);
  if (typeof c != 'number' || !isFinite(c))
    return 0;
  else
    return c;
}

module.exports = router;
