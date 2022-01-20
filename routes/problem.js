const express = require('express'),
      router = express.Router(),
      { LargeObjectManager } = require('pg-large-object'),
      searchURL = require('./util.js').searchURL,
      formatDateISO = require('./util.js').formatDateISO,
      formatDateLocal = require('./util.js').formatDateLocal,
      loadMfrNames = require('./util.js').loadMfrNames,
      searchQuery = require('./util.js').searchQuery;

function select(min) {
  return `select manufacturer, common_name, extract(year from failure_date), count(*)
          from reports
          where failure_date is not null and status <> 'rejected'
          group by 1, 2, 3
          having count(*) >= ${min}
          order by 4 desc, 3 desc`;
}

const MAX_BUCKET = 5;
const MIN_BUCKET = 2;

const DEFAULTS = {
  ad_count: 12,
  ad_window: 5,
  ad_1st: 2,
  ad_2nd: 3,

  eg_count: 8,
  eg_window: 10,
  eg_1st: 2,
  eg_2nd: 4,

  hi_count: 8,
  hi_window: 10,
  hi_1st: 2,
  hi_2nd: 4,

  jk_count: 4,
  jk_window: 10,
  jk_1st: 2,
  jk_2nd: 4,

  lo_count: 2,
  lo_window: 10,
  lo_1st: 2,
  lo_2nd: 3,
};
Object.freeze(DEFAULTS);

router.get(['/problem', '/problem.html'], function(req, res, next) {
  let props = {
    title: 'Problem Motors',
    searched: false,
    results: [],
    errors: [],
    admin: req.session && req.session.authenticated || false,
  };
  for (p in DEFAULTS)
    props[p] = DEFAULTS[p];

  // get summary info
  req.pool.query(select(MIN_BUCKET), (err, q) => {
    if (err)
      return next(err);

    // summarize motor max reports per year
    const max = q.rows[0].count;
    const buckets = [];
    let low = max - max % MAX_BUCKET;
    let high = max;
    while (low >= MIN_BUCKET) {
      let nbucket = 0, nabove = 0;
      let names = [];
      let seen = [];
      q.rows.forEach((r, i) => {
        const name = r.common_name,
              count = parseInt(r.count);
        if (seen.indexOf(name) >= 0)
          return;
        seen.push(name);
        if (count >= low && count <= high) {
          nbucket++;
          names.push(name);
        }
        if (count >= low)
          nabove++;
      });
      let label = low.toFixed();
      if (buckets.length == 0)
        label += "+";
      else if (high > low)
        label += "–" + high.toFixed();
      buckets.push({
        label, low, high, nbucket, nabove, names,
      });
      high = low - 1;
      if (low - 1 < 4)
        low--;
      else if (low - 1 < 10)
        low -= 2;
      else
        low -= MAX_BUCKET;
    }
    props.maxCount = max;
    props.buckets = buckets;

    res.render('problem', props);
  });
});

function motorLabel(row) {
  return row.manufacturer.replace(/ .*$/, '') + ' ' + row.common_name;
}

router.post('/problem', function(req, res, next) {
  let props = {
    title: 'Problem Motors',
    searched: true,
    results: [],
    errors: [],
    admin: req.session && req.session.authenticated || false,
  };

  let inputs = {};
  let missing = 0;
  for (const p in DEFAULTS) {
    const n = parseInt(req.body[p]);
    if (n > 0)
      inputs[p] = n;
    else {
      inputs[p] = DEFAULTS[p];
      missing++;
    }
  }
  if (missing > 0)
    props.errors.push(missing.toFixed() + ' cells had invalid values; using defaults.');
  let min = 9999;
  for (p in inputs) {
    if (/_count$/.test(p) && inputs[p] < min)
      min = inputs[p];
  }
  props.minCount = min;
  for (p in inputs)
    props[p] = inputs[p];

  // get summary info
  const lastYear = new Date().getFullYear() - 1;
  req.pool.query(select(min), (err, q) => {
    if (err)
      return next(err);

    let motorsByLabel = {};
    q.rows.forEach((r, i) => {
      const year = parseInt(r.date_part),
            count = parseInt(r.count);

      // further filter by impulse class
      let letter = r.common_name.substring(0, 1);
      let prefix;
      if (letter <= 'D')
        prefix = 'ad';
      else if (letter <= 'G')
        prefix = 'eg';
      else if (letter <= 'I')
        prefix = 'hi';
      else if (letter <= 'K')
        prefix = 'jk';
      else
        prefix = 'lo';
      let criteria = {
        count: inputs[prefix + '_count'],
        window: inputs[prefix + '_window'],
        '1st': inputs[prefix + '_1st'],
        '2nd': inputs[prefix + '_2nd'],
      };
      if (r.count < criteria.count || year < lastYear - criteria.window)
        return;

      let label = motorLabel(r);
      let info = motorsByLabel[label];
      if (info == null) {
        info = motorsByLabel[label] = {
          label,
          criteria,
          manufacturer: r.manufacturer,
          common_name: r.common_name,
          years: [],
          totalFailures: 0,
          yearFailures: 0,
        };
      }
      info.years.push({
        year: r.date_part,
        count,
      });
      info.totalFailures += count;
      info.yearFailures++;
    });
    let motorsByTrigger = [];
    Object.keys(motorsByLabel).forEach(label => {
      const info = motorsByLabel[label];
      info.years.sort((a, b) => b.year - a.year);
      if (info.yearFailures >= info.criteria['2nd'])
        info.trigger = 2;
      else if (info.yearFailures >= info.criteria['1st'])
        info.trigger = 1;
      else
        info.trigger = 0;
      motorsByTrigger.push(info);
    });
    motorsByTrigger.sort((a, b) => {
      if (a.trigger != b.trigger)
          return b.trigger - a.trigger;
      return b.totalFailures - a.totalFailures;
    });

    // see if any were found
    if (motorsByTrigger.length < 1)
      res.render('problem', props);
    else {
      props.motors = motorsByTrigger;
      res.render('problem-list', props);
    }
  });
});

module.exports = router;
