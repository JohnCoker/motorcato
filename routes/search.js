const express = require('express'),
      router = express.Router(),
      moment = require('moment'),
      quoteSqlStr = require('./util.js').quoteSqlStr,
      searchURL = require('./util.js').searchURL,
      formatDateISO = require('./util.js').formatDateISO,
      formatDateLocal = require('./util.js').formatDateLocal,
      loadMfrNames = require('./util.js').loadMfrNames;

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
    col: "rejected",
    type: "bool",
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

const Limit = 50;
const LimitPlus = Limit + Math.ceil(Limit / 10);

function searchPage(req, res, next, params) {
  let props = {
    title: 'Search Reports',
    searched: false,
    criteria: {
      failure_date_compare: '>=',
    },
    results: [],
    errors: [],
    admin: req.session && req.session.authenticated || false,
  };

  let keys = [], comparisons = [], byId = false;
  if (params != null) {
    function compareOp(key) {
      let op = params[key + '_compare'];
      if (op == null || op === '' || !/^[<>]?=?$/.test(op))
        op = "=";
      return op;
    }
    keys = Object.keys(params);
    keys.forEach(key => {
      let info = SearchCols[key];
      if (info) {
        let value = params[key];
        if (info.sql) {
          let sql = info.sql(value);
          if (sql) {
            comparisons.push(sql);
            props.criteria[key] = value;
          }
        } else if (value == 'null') {
          comparisons.push(info.col + " is null");
          props.criteria[key] = 'null';
        } else if (info.type == 'date') {
          value = moment(value, 'YYYY-M-D', true);
          if (value.isValid()) {
            let compare = compareOp(key);
            comparisons.push(info.col + " " + compare + " '" + value.format("YYYY-MM-DD") + "'");
            props.criteria[key] = value;
            props.criteria[key + '_compare'] = compare;
          }
        } else if (info.type == 'int') {
          value = parseInt(value);
          if (!isNaN(value)) {
            let compare = compareOp(key);
            comparisons.push(info.col + " " + compare + " " + value.toFixed());
            props.criteria[key] = value;
            props.criteria[key + '_compare'] = compare;
          }
        } else if (info.type == 'bool') {
          if (value === 'false')
            comparisons.push("not " + info.col);
          else {
            comparisons.push(info.col);
            props.criteria[key] = true;
          }
        } else if (value != null && value !== '') {
          comparisons.push(info.col + " = " + quoteSqlStr(value));
          props.criteria[key] = value;
        }
        if (info.id)
          byId = true;
      }
    });
  }

  if (comparisons.length > 0) {
    let fails = comparisons.filter(sql => /^fail_/.test(sql));
    if (fails.length > 1) {
      comparisons = comparisons.filter(sql => !/^fail_/.test(sql));
      comparisons.push("(" + fails.join(" or ") + ")");
    }
    if (!byId && keys.indexOf('rejected') < 0)
      comparisons.push("not rejected");

    let where = "\n where " + comparisons.join("\n       and ");
    let select = ("select * from reports" +
                  where +
                  "\n order by failure_date desc, manufacturer, common_name" +
                  "\n limit " + (LimitPlus + 1).toFixed());
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
        FailureCols.forEach(info => {
          if (r[info.col] === true)
            fail_all.push(info.col);
        });
        if (fail_all.length == 1)
          result.fail_summary = fail_all[0].substring(5).replace(/_/g, ' ');
        else if (fail_all.length > 1)
          result.fail_summary = 'multiple';

        props.results.push(result);
      });
      props.result_count = props.results.length.toFixed();
      props.total_count = props.results.length.toFixed();

      if (props.results.length == 1) {
        props.title = 'Search Result';
        props.result = props.results[0];
        res.render('search-single', props);
      } else if (props.results.length > 1) {
        props.title = 'Search Results';
        if (props.results.length > LimitPlus) {
          props.results.length = Limit;
          props.result_count = Limit.toFixed();
          props.total_count += '+';
          props.more = true;

          let count = "select count(*) from reports" + where;
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

module.exports = router;
