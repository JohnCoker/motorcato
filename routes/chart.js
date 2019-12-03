const express = require('express'),
      router = express.Router(),
      searchQuery = require('./util.js').searchQuery;

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const UNITS = [
  {
    name: 'month',
    start: function(d) {
      return new Date(d.getFullYear(), d.getMonth(), 1);
    },
    end: function(d) {
      let m = d.getMonth() + 1,
          y = d.getFullYear();
      if (m > 11) {
        m = 0;
        y++;
      }
      return new Date(y, m, 1);
    },
    label: function(d) {
      return MONTH_NAMES[d.getMonth()] + " '" + (d.getFullYear() % 100).toFixed();
    }
  },
  {
    name: 'quarter',
    start: function(d) {
      return new Date(d.getFullYear(), 3 * Math.floor(d.getMonth() / 3), 1);
    },
    end: function(d) {
      let m = 3 * Math.floor(d.getMonth() / 3 + 1),
          y = d.getFullYear();
      if (m > 11) {
        m = 0;
        y++;
      }
      return new Date(y, m, 1);
    },
    label: function(d) {
      return (d.getMonth() / 3 + 1).toFixed() + 'Q' + (d.getFullYear() % 100).toFixed();
    }
  },
  {
    name: 'year',
    start: function(d) {
      return new Date(d.getFullYear(), 0, 1);
    },
    end: function(d) {
      return new Date(d.getFullYear() + 1, 0, 1);
    },
    label: function(d) {
      return d.getFullYear().toFixed();
    }
  },
];

function unitCategories(unit, first, last) {
  let start = unit.start(first),
      end = unit.end(first),
      lastStart = unit.start(last),
      cats = [];
  while (start.getTime() <= lastStart.getTime()) {
    cats.push({
      label: unit.label(start),
      start: start,
      end: end,
    });
    start = end;
    end = unit.end(start);
  }
  return cats;
}

function pickCategories(first, last, max) {
  if (!(max > 0))
    max = 1000;
  let cats;
  for (let i = 0; i < UNITS.length; i++) {
    cats = unitCategories(UNITS[i], first, last);
    if (cats.length <= max)
      return cats;
  }
  return cats;
}

const DefaultColumns = 12;

router.get(['/chart', '/chart.svg'], function(req, res, next) {
  let search = searchQuery(req, res, req.query),
      where = search.where,
      columns = DefaultColumns;

  if (where == null)
    where = "\n where status != 'rejected'";
  where += "\n       and failure_date is not null";

  if (req.query.columns != null) {
    columns = parseInt(req.query.columns);
    if (isNaN(columns) || !isFinite(columns))
      columns = DefaultColumns;
  }

  let select = ("select extract(year from failure_date) as year, extract(month from failure_date) as month, count(*) as count" +
                " from reports" +
                where +
                "\n group by 1, 2" +
                "\n order by 1, 2");
  req.pool.query(select, (err, q) => {
    if (err)
      return next(err);

    let first, last;
    q.rows.forEach(r => {
      let d = new Date(r.year, r.month - 1, 15);
      if (first == null || d < first)
        first = d;
      if (last == null || d > last)
        last = d;
    });
    let categories = pickCategories(first, last, columns),
        maxCount = 0;
    categories.forEach(cat => {
      let count = 0;
      q.rows.forEach(r => {
        let d = new Date(r.year, r.month - 1, 15);
        if (d >= cat.start && d < cat.end)
          count += parseInt(r.count);
      });
      cat.count = count;
      if (count > maxCount)
        maxCount = count;
    });

    let height = 0.2,
        colWidth = 1.0 / categories.length,
        pad = colWidth / 16,
        heightScale = height * 0.75,
        baseline = height - (height - heightScale) / 2,
        fontHeight = 0.6 * (height - baseline),
        textPadY = (height - baseline) / 5,
        titleY = height - textPadY * 1.5;
    let svg = `<svg viewBox="0,0,1,${height}" xmlns="http://www.w3.org/2000/svg">
  <style type="text/css">
  .background {
    fill: white;
  }
  .axis {
    stroke: #aaa;
    stroke-width: 0.0012;
  }
  .bar {
    stroke: #aaa;
    stroke-width: 0.001;
    fill: #ddd;
  }
  .label, .count {
    font-size: ${fontHeight}px;
    text-anchor: middle;
  }
  </style>
  <rect class="background" x="0" y="0" width="1" height="${height}" />
  <line class="axis" x1="0" y1="${baseline}" x2="1" y2="${baseline}" />
`;

    categories.forEach((cat, i) => {
      let x = i * colWidth;
      let h = 0;
      if (cat.count > 0) {
        h = heightScale * (cat.count / maxCount) - 0.0006;
        svg += `  <rect class="bar" x="${x + pad}" y="${baseline - h}" width="${colWidth - pad * 2}" height="${h}"/>\n`;
      }
      let xc = x + colWidth / 2;
      svg += `  <text class="label" x="${xc}" y="${titleY}">${cat.label}</text>\n`;
      svg += `  <text class="count" x="${xc}" y="${baseline - h - textPadY}">${cat.count}</text>\n`;
    });
    svg += '</svg>';
    res.type('image/svg+xml')
       .send(svg);
  });
});

module.exports = router;
