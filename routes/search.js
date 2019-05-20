const express = require('express'),
      router = express.Router(),
      moment = require('moment'),
      escape = require('escape-html'),
      searchURL = require('./util.js').searchURL,
      formatDateISO = require('./util.js').formatDateISO,
      formatDateLocal = require('./util.js').formatDateLocal;

const SearchTitle = 'Search Reports';

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
  let sql = "(";
  FailureCols.forEach((info, i) => {
    if (i > 0)
      sql += " and ";
    sql += " not " + info.col;
  });
  sql += ")";
  let info = {
    col: "fail_unknown",
    type: "bool",
    sql: sql,
  };
})();

const Limit = 50;
const LimitPlus = Limit + Math.ceil(Limit / 10);

function searchPage(req, res, next, params) {
  let keys = [], comparisons = [], byId = false;
  console.log('params:');
  console.log(params);
  if (params != null) {
    keys = Object.keys(params);
    keys.forEach(key => {
      let info = SearchCols[key];
      if (info) {
        if (info.sql) {
          comparisons.push(info.sql);
        } else if (params[key] == "null") {
          comparisons.push(info.col + " is null");
        } else {
          let value;
          if (info.type == 'date') {
            value = moment(params[key], 'YYYY-M-D', true);
            if (value.isValid())
              comparisons.push(info.col + " = '" + moment.format("YYYY-MM-DD") + "'");
          } else if (info.type == 'int') {
            value = parseInt(params[key]);
            if (!isNaN(value))
              comparisons.push(info.col + " = " + value.toFixed());
          } else if (info.type == 'bool') {
            if (params[key] === 'false')
              comparisons.push("not " + info.col);
            else
              comparisons.push(info.col);
          } else {
            value = params[key];
            if (typeof value != null)
              comparisons.push(info.col + " = '" + value.replace(/'/g, "''") + "'");
          }
        }
        if (info.id)
          byId = true;
      }
    });
  }

  let props = {
    title: SearchTitle,
    searched: false,
    results: [],
  };
  if (comparisons.length > 0) {
    if (!byId && keys.indexOf('rejected') < 0)
      comparisons.push("not rejected");
    let fails = comparisons.filter(sql => /^fail_/.test(sql));
    if (fails.length > 1) {
      comparisons = comparisons.filter(sql => !/^fail_/.test(sql));
      comparisons.push("(" + fails.join(" or ") + ")");
    }

    let select = ("select * from reports" +
                  "\n where " + comparisons.join("\n       and ") +
                  "\n order by failure_date desc, manufacturer, common_name" +
                  "\n limit " + (LimitPlus + 1).toFixed());
    console.log(select);
    req.pool.query(select, (err, q) => {
      if (err)
        return next(err);

      props.searched = true;
      q.rows.map(r => {
        let result = {};
        Object.keys(r).forEach(col => {
          if (/^reporter_/.test(col))
            return;

          result[col] = r[col];
          if (col == 'failure_date') {
            result.failure_date_iso = formatDateISO(r.failure_date);
            result.failure_date_local = formatDateLocal(req, r.failure_date);
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
        props.result = props.results[0];
        res.render('search-single', props);
      } else if (props.results.length > 1) {
        if (props.results.length > LimitPlus) {
          props.results.length = Limit;
          props.result_count = Limit.toFixed();
          props.total_count += '+';
          props.more = true;
        }
        res.render('search-list', props);
      } else {
        res.render('search', props);
      }
    });
  } else {
    res.render('search', props);
  }
}

router.get('/search', function(req, res, next) {
  searchPage(req, res, next, req.query);
});
router.post('/search', function(req, res, next) {
  searchPage(req, res, next, req.body);
});

module.exports = router;
