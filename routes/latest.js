const express = require('express'),
      router = express.Router(),
      moment = require('moment'),
      searchURL = require('./util.js').searchURL,
      formatDateISO = require('./util.js').formatDateISO,
      formatDateLocal = require('./util.js').formatDateLocal;

const LatestSelect = `
select manufacturer, common_name, max(failure_date) as last_date, count(*)
 from reports
`;

const LastFailuresQuery = `${LatestSelect}
 where not rejected and failure_date >= now() - interval '90 days'
 group by 1, 2
 order by 3 desc, 4 desc, 1, 2
 limit 25
`;

const MostFailuresQuery = `${LatestSelect}
 where not rejected
 group by 1, 2
 having count(*) > 1
 order by 4 desc, 3 desc, 1, 2
 limit 25
`;

router.get(['/latest', '/latest.html'], function(req, res, next) {
  let props = {
    title: 'Latest Reports'
  };

  function table(q) {
    return q.rows.map(r => {
      return {
        manufacturer: r.manufacturer,
        common_name: r.common_name,
        last_date_iso: formatDateISO(r.last_date),
        last_date_local: formatDateLocal(req, r.last_date),
        count: r.count,
        manufacturer_search: searchURL({ manufacturer: r.manufacturer }),
        motor_search: searchURL({ manufacturer: r.manufacturer, common_name: r.common_name }),
      };
    });
  };

  req.pool.query(LastFailuresQuery, (err, q) => {
    if (err)
      return next(err);

    props.last = table(q);
    props.last_count = props.last.length;

    req.pool.query(MostFailuresQuery, (err, q) => {
      if (err)
        return next(err);

      props.most = table(q);
      props.most_count = props.most.length;
      res.render('latest', props);
    });
  });
});

module.exports = router;
