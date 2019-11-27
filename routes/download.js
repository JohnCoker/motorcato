const express = require('express'),
      router = express.Router(),
      csvWriter = require('csv-writer'),
      formatDateISO = require('./util.js').formatDateISO;

router.get(['/download.csv'], function(req, res, next) {
  let select = ("select * from reports" +
                "\n where status != 'rejected'" +
                "\n order by failure_date");
  let admin = req.session && req.session.authenticated || false;
  req.pool.query(select, (err, q) => {
    if (err)
      return next(err);

    let headers = [];
    let rows = [];
    q.rows.map((r, ri) => {
      // extract headers from first result
      if (ri == 0) {
        Object.keys(r).forEach(col => {
          if (!admin &&
              (/id$/.test(col) ||
               col == 'status' || col == 'created_at' ||
               col == 'burn_through_loc' || col == 'other_desc' || col == 'comments' ||
               /^reporter_/.test(col)))
            return;
          headers.push({ id: col, title: col });
        });
      }

      // build row of values by header
      let row = {};
      headers.forEach(hdr => {
        let col = hdr.id,
            value = r[col];
        if (value == null || value === false || value === '')
          return;
        if (/_date$/.test(col))
          value = formatDateISO(value);
        else if (value === true)
          value = '1';
        row[col] = value;
      });
      rows.push(row);
    });

    // stream the result as CSV
    const csv = csvWriter.createObjectCsvStringifier({
      header: headers,
    });

    res.type('application/csv')
       .send(csv.getHeaderString() + csv.stringifyRecords(rows));
  });
});

module.exports = router;
