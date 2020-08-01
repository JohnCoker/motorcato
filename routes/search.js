const express = require('express'),
      router = express.Router(),
      { LargeObjectManager } = require('pg-large-object'),
      searchURL = require('./util.js').searchURL,
      formatDateISO = require('./util.js').formatDateISO,
      formatDateLocal = require('./util.js').formatDateLocal,
      loadMfrNames = require('./util.js').loadMfrNames,
      searchQuery = require('./util.js').searchQuery;

const DefaultLimit = 50;

function searchPage(req, res, next, params) {
  let props = {
    title: 'Search Reports',
    searched: false,
    results: [],
    errors: [],
    admin: req.session && req.session.authenticated || false,
  };

  let search = searchQuery(req, res, params);
  props.criteria = search.criteria;
  if (search.comparisons.length > 0) {
    if (search.query)
      props.queryUrl = '/search' + search.query;

    let offset = 0, limit = DefaultLimit;
    if (params.limit != null) {
      limit = parseInt(params.limit);
      if (isNaN(limit) || !isFinite(limit))
        limit = DefaultLimit;
    }
    if (params.offset != null) {
      offset = parseInt(params.offset);
      if (isNaN(offset) || !isFinite(offset) || offset < 0)
        offset = 0;
    }

    let select = ("select * from reports" +
                  search.where +
                  "\n order by failure_date desc, manufacturer, common_name");
    if (offset > 0)
      select += "\n offset " + offset.toFixed();
    var limitPlus = 0;
    if (limit > 0) {
      limitPlus = Math.ceil(limit * 1.1);
      select += "\n limit " + (limitPlus + 1).toFixed();
    }
    req.pool.query(select, (err, q) => {
      if (err)
        return next(err);

      props.searched = true;
      q.rows.map(r => {
        let result = {};
        Object.keys(r).forEach(col => {
          if (/^reporter_/.test(col) && !props.admin)
            return;

          result[col] = r[col];
          if (col == 'failure_date') {
            result.failure_date_iso = formatDateISO(r.failure_date);
            result.failure_date_local = formatDateLocal(req, r.failure_date);
          }
          if (col == 'reported_date') {
            result.reported_date_iso = formatDateISO(r.reported_date);
            result.reported_date_local = formatDateLocal(req, r.reported_date);
          }
          result.id_search = searchURL({ id: r.id });
          result.manufacturer_search = searchURL({ manufacturer: r.manufacturer });
          result.motor_search = searchURL({ manufacturer: r.manufacturer, common_name: r.common_name });
        });

        let fail_all = [];
        search.FailureCols.forEach(info => {
          if (r[info.col] === true)
            fail_all.push(info.col);
        });
        if (fail_all.length == 1)
          result.fail_summary = fail_all[0].substring(5).replace(/_/g, ' ');
        else if (fail_all.length > 1)
          result.fail_summary = 'multiple';

        props.results.push(result);
      });
      props.result_count = props.results.length;
      props.total_count = offset + props.results.length;

      if (props.results.length == 1) {
        props.title = 'Search Result';
        props.result = props.results[0];
        req.pool.query("select * from photos where report = " + props.result.id, (err, q) => {
          if (err)
            return next(err);

          if (q.rows && q.rows.length > 0) {
            props.result.hasPhotos = true;
            props.result.photos = q.rows.map(p => {
              p.url = "/photo/" + p.id;
              return p;
            });
          } else {
            props.result.hasPhotos = false;
            props.result.photos = [];
          }
          res.render('search-single', props);
        });
      } else if (props.results.length > 1) {
        props.title = 'Search Results';
        props.limit = limit;
        props.offset = offset;
        if (props.results.length >= 10)
          props.chartUrl = '/chart.svg' + search.query;
        if (limitPlus > 0 && props.results.length > limitPlus) {
          props.results.length = limit;
          props.result_count = limit;
          props.total_count += '+';
          props.more = true;
          props.allUrl = props.queryUrl + '&limit=-1';
          props.moreUrl = props.queryUrl + '&offset=' + (offset + limit).toFixed();
          props.csvUrl = '/search.csv' + search.query;

          let count = "select count(*) from reports" + search.where;
          req.pool.query(count, (err, q) => {
            if (!err)
              props.total_count = q.rows[0].count;
            res.render('search-list', props);
          });
        } else
          res.render('search-list', props);
      } else {
        loadMfrNames().then(list => {
          props.manufacturers = list;
          res.render('search', props);
        }).catch(e => next(e));
      }
    });
  } else {
    loadMfrNames().then(list => {
      props.manufacturers = list;
      res.render('search', props);
    }).catch(e => next(e));
  }
}

router.get(['/search', '/search.html'], function(req, res, next) {
  searchPage(req, res, next, req.query);
});
router.post('/search', function(req, res, next) {
  searchPage(req, res, next, req.body);
});

function searchCSV(req, res, next, params) {
  const admin = req.session && req.session.authenticated;
  let search = searchQuery(req, res, params);
  let select = ("select * from reports" +
                search.where +
                "\n order by failure_date desc, manufacturer, common_name");
  req.pool.query(select, (err, q) => {
    if (err)
      return next(err);

    function skip(col) {
      if (col === 'id' || col === 'created_at' || col === 'old_id')
        return true;
      if (/^reporter_/.test(col) && !admin)
        return true;
      return false;
    }

    function csv(value) {
      if (value == null)
        value = '';
      else if (typeof value == 'boolean')
        value = value ? 'true' : '';
      else
        value = String(value);
      let s;
      if (/[,\s"\\]/.test(value)) {
        return '"' + value.replace(/["\\]/g, '$&$&') + '"';
      } else {
        return value;
      }
    }

    res.type('text/csv')
       .attachment('reports.csv');

    let line = '', shown = 0;
    q.fields.forEach((f, i) => {
      if (skip(f.name))
        return;

      if (shown > 0)
        line += ',';
      line += '"';
      f.name.split('_').forEach((w, i) => {
        if (i > 0)
          line += ' ';
        line += w.charAt(0).toUpperCase();
        line += w.substring(1);
      });
      line += '"';
      shown++;
    });
    res.write(line + '\r\n');

    q.rows.forEach((r, i) => {
      line = '';
      shown = 0;
      Object.keys(r).forEach((col, i) => {
        if (skip(col))
          return;

        let value = r[col];
        if (/_date$/.test(col))
          value = formatDateISO(value);

        if (shown > 0)
          line += ',';
        line += csv(value);
        shown++;
      });
      res.write(line + '\r\n');
    });

    res.end();
  });
}

router.get('/search.csv', function(req, res, next) {
  searchCSV(req, res, next, req.query);
});
router.post('/search.csv', function(req, res, next) {
  searchCSV(req, res, next, req.body);
});

router.get('/photo/:id', function(req, res, next) {
  if (req.params.id == null || req.params.id === '')
    return next();
  return next();
  req.pool.connect((err, client, release) => {
    if (err)
      return next(err);

    const lom = new LargeObjectManager({ pg: client });
    client.query('begin', (err, tx) => {
      if (err) {
        release(err);
        return next(err);
      }

      client.query('select * from photos where id = $1', [req.params.id], (err, q) => {
        if (err) {
          release(err);
          return next(err);
        }
        if (q.rows.length != 1) {
          release();
          return next();
        }
        const r = q.rows[0];

        lom.openAndReadableStream(r.image_oid, 2048 * 8, (err, size, stream) => {
          if (err) {
            release(err);
            return next(err);
          }
          res.type(r.content_type)
             .set('Content-Length', size);
          stream.on('readable', () => res.write(stream.read()))
                .on('end', () => {
                  res.end();
                  client.query('commit', release);
                });
        });
      });
    });
  });
});

module.exports = router;
