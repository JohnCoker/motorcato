const express = require('express'),
      router = express.Router(),
      loadMfrNames = require('./util.js').loadMfrNames,
      isEmpty = require('./util.js').isEmpty,
      nonEmpty = require('./util.js').nonEmpty,
      integer = require('./util.js').integer,
      posInteger = require('./util.js').posInteger,
      posNumber = require('./util.js').posNumber,
      parseDateISO = require('./util.js').parseDateISO,
      formatDateISO = require('./util.js').formatDateISO,
      commonName = require('./util.js').commonName,
      originURL = require('./util.js').originURL;

const ReportTitle = 'Report a Malfunction';

function reportProps() {
  let props = {
    title: 'Report a Malfunction',
    errors: []
  };
  return new Promise((resolve, reject) => {
    loadMfrNames().then(list => {
      props.manufacturers = list;
      resolve(props);
    }).catch(e => reject(e));
  });
}
router.get(['/report', '/report.html'], function(req, res, next) {
  reportProps().then(props => res.render('report', props))
               .catch(err => next(err));

});
router.post('/report', function(req, res, next) {
  reportProps().then(props => {
    let failed = false;

    props.submitted = true;

    let mfr = nonEmpty(req.body.manufacturer);
    if (mfr == null || props.manufacturers.indexOf(mfr) < 0) {
      props.errors.push('Please select the motor manufacturer from the list.');
      failed = true;
    } else
      props.manufacturer = mfr;

    let desig = nonEmpty(req.body.designation),
        common;
    if (desig == null || (common = commonName(desig)) == null) {
      props.errors.push('Please enter the manufacturer designation or common name.');
      failed = true;
    } else {
      props.designation = desig;
      props.common_name = common;
    }

    let type = nonEmpty(req.body.motor_type);
    if (type != 'SU' && type != 'reload' && type != 'hybrid') {
      props.errors.push('Please enter the motor type; typically "single-use" for Estes/Quest.');
      failed = true;
    } else
      props.motor_type = type;

    props.serial_no = nonEmpty(req.body.serial_no);

    let date = nonEmpty(req.body.failure_date);
    if (date != null) {
      if ((date = parseDateISO(date)) == null) {
        props.errors.push('Please enter the date on which the failure occurred.');
        failed = true;
      } else
        props.failure_date = formatDateISO(date);
    }

    props.location = nonEmpty(req.body.location);

    props.temperature = integer(req.body.temperature);

    props.fail_nozzle_blown = nonEmpty(req.body.fail_nozzle_blown) != null;
    props.fail_ejection_blown = nonEmpty(req.body.fail_ejection_blown) != null;
    props.fail_casing_split = nonEmpty(req.body.fail_casing_split) != null;
    props.fail_propellant_ejected = nonEmpty(req.body.fail_propellant_ejected) != null;
    props.fail_burn_through = nonEmpty(req.body.fail_burn_through) != null;
    if (props.fail_burn_through) {
      props.burn_through_loc = nonEmpty(req.body.burn_through_loc);
      if (props.burn_through_loc == null) {
        props.errors.push('Please enter where on the motor burned through');
        failed = true;
      }
    }
    props.fail_no_ejection = nonEmpty(req.body.fail_no_ejection) != null;
    props.fail_bad_delay = nonEmpty(req.body.fail_bad_delay) != null;
    if (props.fail_bad_delay) {
      props.actual_delay = posNumber(req.body.actual_delay);
      if (props.actual_delay == null && nonEmpty(req.body.actual_delay) != null) {
        props.errors.push('Please enter an estimate of the actual delay time.');
        failed = true;
      }
    }
    props.fail_other = nonEmpty(req.body.fail_other) != null;
    if (props.fail_other) {
      props.other_desc = nonEmpty(req.body.other_desc);
      if (props.other_desc == null) {
        props.errors.push('Please enter a short description of the failure.');
        failed = true;
      }
    }
    props.comments = nonEmpty(req.body.comments);

    props.reported_mfr = nonEmpty(req.body.reported_mfr) != null;
    props.more_motors = nonEmpty(req.body.more_motors) != null;

    props.reporter_name = nonEmpty(req.body.reporter_name);
    props.reporter_email = nonEmpty(req.body.reporter_email);
    props.reporter_addr1 = nonEmpty(req.body.reporter_addr1);
    props.reporter_addr2 = nonEmpty(req.body.reporter_addr2);
    props.reporter_city = nonEmpty(req.body.reporter_city);
    props.reporter_state = nonEmpty(req.body.reporter_state);
    props.reporter_zip = nonEmpty(req.body.reporter_zip);
    props.reporter_phone = nonEmpty(req.body.reporter_phone);
    props.reporter_nar = posInteger(req.body.reporter_nar);
    props.reporter_car = posInteger(req.body.reporter_car);
    props.reporter_tra = posInteger(req.body.reporter_tra);
    props.reporter_ukra = posInteger(req.body.reporter_ukra);

    if (failed)
      res.render('report', props);
    else {
      let columns = [];
      let values = [];
      function cv(col) {
        let v = props[col];
        if (v != null && v !== false) {
          columns.push(col);
          values.push(v);
        }
      }
      cv('manufacturer');
      cv('designation');
      cv('common_name');
      cv('motor_type');
      cv('serial_no');
      cv('failure_date');
      cv('location');
      cv('temperature');
      cv('fail_nozzle_blown');
      cv('fail_ejection_blown');
      cv('fail_casing_split');
      cv('fail_propellant_ejected');
      cv('fail_burn_through');
      cv('burn_through_loc');
      cv('fail_no_ejection');
      cv('fail_bad_delay');
      cv('actual_delay');
      cv('fail_other');
      cv('other_desc');
      cv('reported_mfr');
      cv('more_motors');
      cv('comments');
      cv('reported_date');
      cv('reporter_name');
      cv('reporter_addr1');
      cv('reporter_addr2');
      cv('reporter_city');
      cv('reporter_state');
      cv('reporter_zip');
      cv('reporter_email');
      cv('reporter_phone');
      cv('reporter_nar');
      cv('reporter_car');
      cv('reporter_tra');
      cv('reporter_ukra');
      let insert = ("insert into reports (" + columns.join(", ") + ")" +
                    "\n values (" + columns.map((v, i) => "$" + (i + 1)).join(", ") + ")" +
                    "  returning id");
      req.pool.query(insert, values, (err, q) => {
        if (err)
          return next(err);

        props.entered = true;
        if (q.rows.length == 1 && q.rows[0].id > 0)
          props.url = originURL(req) + "/search?id=" + q.rows[0].id;
        res.render('report', props);
      });
    }
  }).catch(err => next(err));
});

module.exports = router;
