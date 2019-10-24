const fs = require('fs'),
      csv = require('csv-parse');

const infile = '../../tmp/mess.csv',
      outfile = '../../tmp/migrate.sql';

const Manufacturers = {
  'AeroTech': true,
  'AMW': 'Animal Motor Works',
  'CTI': 'Cesaroni Technology',
  'Ellis Mountain': true,
  'Estes': 'Estes Industries',
  'Gorilla': 'Gorilla Rocket Motors',
  'KBA': 'Kosdon by AeroTech',
  'Quest': 'Quest Aerospace',
  'RattWorks': 'R.A.T.T. Works',
  'Road Runner': true,
  'SkyRipper': 'Sky Ripper Systems',
  'Loki Research': true,
  'Loki': 'Loki Research',
  'Apogee (Aerotech)': 'AeroTech',
  'Southern Cross Rocketry': true,
};

function convertDate(v) {
  let m;

  if (v == '2-Sep.-2017')
    return '2017-10-02';
  if (v == 'September 10th 216')
    return '2016-10-10';
  if (v == '06/1402015')
    return '2015-06-14';
  if (v == '6-25 16')
    return '2016-06-25';
  if (v == '6/318')
    return '2018-06-03';

  function date(y, m, d) {
    let year = parseInt(y);
    if (isNaN(year) || !(year > 0))
      return;
    if (year < 100)
      year += 2000;

    let month;
    if (/^[a-z]{3}/i.test(m)) {
      let pre = m.toLowerCase().substring(0, 3);
      month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(pre);
      if (month < 0)
        return;
      month++;
    } else {
      month = parseInt(m);
      if (isNaN(month) || !(month > 0))
        return;
    }

    day = parseInt(d);
    if (isNaN(day) || !(day > 0) || day > 31)
      return;
    if (month > 12) {
      if (day <= 12 && month <= 31) {
        var t = day;
        day = month;
        month = t;
      } else
        return;
    }

    function pad2(n) {
      var s = '';
      if (n < 10)
        s = '0';
      return s + n.toFixed();
    }

    return year.toFixed() + '-' + pad2(month) + '-' + pad2(day);
  }

  if (m = /^Saturday,? *(.*)$/i.exec(v))
    v = m[1];

  if (m = /^([a-z]+)\.?  *(\d+)[a-z]*?,? *(\d{4})/i.exec(v)) {
    // February 2nd, 2013
    return date(m[3], m[1], m[2]);
  } else if (m = /^(\d+)-([a-z]+)-(\d{2})$/i.exec(v)) {
    // 19-Jul-13
    return date(m[3], m[2], m[1]);
  } else if (m = /^(\d+)[a-z]* +([a-z]+)[,.]? *(\d{2,4})/i.exec(v)) {
    // 5th May 2019
    return date(m[3], m[2], m[1]);
  } else if (m = /^(\d+)[/. -](\d+)[/. -](\d{2,4}) */.exec(v)) {
    // 7/22/13
    return date(m[3], m[1], m[2]);
  }
}

function convertBoolean(v) {
  return v === '1';
}

function convertTemperature(v) {
  // 50°F
  let m = /^[^\d]*(-?\d+)[^\d]*$/.exec(v);
  if (m)
    return parseInt(m[1]);

  // 60-70
  m = /^[^\d]*(-?\d+) *(?:-|to) *(-?\d+)[^\d]*$/.exec(v);
  if (m)
    return Math.round((parseInt(m[1]) + parseInt(m[2])) / 2);
}

function convertNumber(v) {
  // 4.4
  let n = parseFloat(v);
  if (n > 0)
    return n.toFixed(1);

  // 0-1
  let m = /^(-\d+) *- *(\d+)*$/.exec(v);
  if (m)
    return ((parseInt(m[1]) + parseInt(m[2])) / 2).toFixed();
}

const FieldMap = {
  FailureID: {
    toField: 'old_id',
    validate: /^\d*$/,
  },
  Manufacturer: {
    toField: 'manufacturer',
    convert: v => {
      let r = Manufacturers[v];
      if (r != null) {
        if (typeof r == 'string')
          return r;
        else
          return v;
      }
    },
    required: true,
  },
  EngineCode: {
    toField: 'designation',
    convert: v => {
      if (/^MicroMaxx *(II|2)/i.test(v) || /^1\/8A/.test(v))
        return 'MicroMaxx II';
      if (/^MicroMaxx/i.test(v))
        return 'MicroMaxx';

      let m = /^(.*[^a-z])?([a-z])[ -]?([1-9])(.*)$/i.exec(v);
      if (m)
        return (m[1] == null ? '' : m[1]) + m[2].toUpperCase() + m[3] + m[4];
    },
    required: true,
  },
  Reloadable: {
    toField: 'motor_type',
    convert: v => v === '1' ? 'reload' : 'SU',
  },
  CasingDate: {
    toField: 'serial_no',
    convert: v => /^unk/i.test(v) ? null : v,
  },
  FailureDate: {
    toField: 'failure_date',
    convert: convertDate,
  },
  FailureLocation: {
    toField: 'location',
  },
  Temperature: {
    toField: 'temperature',
    convert: convertTemperature,
  },
  NozzleBlown: {
    toField: 'fail_nozzle_blown',
    convert: convertBoolean,
  },
  EjectionBlown: {
    toField: 'fail_ejection_blown',
    convert: convertBoolean,
  },
  CasingSplit: {
    toField: 'fail_casing_split',
    convert: convertBoolean,
  },
  PropellantEjected: {
    toField: 'fail_propellant_ejected',
    convert: convertBoolean,
  },
  BurnThrough: {
    toField: 'fail_burn_through',
    convert: convertBoolean,
  },
  BurnThroughDescr: {
    toField: 'burn_through_loc',
  },
  NoEjection: {
    toField: 'fail_no_ejection',
    convert: convertBoolean,
  },
  BadDelay: {
    toField: 'fail_bad_delay',
    convert: convertBoolean,
  },
  ActualDelay: {
    toField: 'actual_delay',
    convert: convertNumber,
  },
  OtherFailure: {
    toField: 'fail_other',
    convert: convertBoolean,
  },
  OtherFailureDescr: {
    toField: 'other_desc',
  },
  MfrNotified: {
    toField: 'reported_mfr',
    convert: convertBoolean,
  },
  HaveMore: {
    toField: 'more_motors',
    convert: convertBoolean,
  },
  Comments: {
    toField: 'comments',
  },
  SubmittedBy: {
    toField: 'reporter_name',
  },
  Addr1: {
    toField: 'reporter_addr1',
  },
  Addr2: {
    toField: 'reporter_addr2',
  },
  City: {
    toField: 'reporter_city',
  },
  State: {
    toField: 'reporter_state',
  },
  ZIP: {
    toField: 'reporter_zip',
  },
  Phone: {
    toField: 'reporter_phone',
  },
  Email: {
    toField: 'reporter_email',
  },
  MemberNumNAR: {
    toField: 'reporter_nar',
    validate: /^\d+$/,
  },
  MemberNumCAR: {
    toField: 'reporter_car',
    validate: /^\d+$/,
  },
  MemberNumTRA: {
    toField: 'reporter_tra',
    validate: /^\d+$/,
  },
};

const out = fs.createWriteStream(outfile);
const verbose = false;
out.write('-- migrated ' + new Date().toISOString() + '\n');
let total = 0, rejected = 0, lineNum = 1;
fs.createReadStream(infile)
  .pipe(csv({ trim: true, skipEmptyLines: true, columns: true }))
  .on('data', row => {
    let cols = {}, missing = false;
    Object.keys(row).forEach(key => {
      lineNum++;
      let orig = row[key];
      if (orig == null || orig === '' || orig === 'NULL' || /^\s*$/.test(orig) ||
          /^-+$/.test(orig) || /^n *\/ *a*$/i.test(orig) || /^na$/i.test(orig) ||
          /^unknown/i.test(orig) || /^none/i.test(orig))
        orig = null;
      let value = orig;

      let map = FieldMap[key];
      if (map == null)
        throw new Error('line ' + lineNum + ': unknown field: ' + key);

      if (value != null) {
        if (typeof map.convert == 'function') {
          value = map.convert(value);
          if (value == null && verbose)
            console.log('line ' + lineNum + ': invalid  ' + key + ': ' + row[key]);
        }

        if (map.validate != null) {
          if (map.validate instanceof RegExp) {
            if (!map.validate.test(value)) {
              if (verbose)
                console.log('line ' + lineNum + ': invalid  ' + key + ': ' + row[key]);
              value = null;
            }
          } else {
            if (!map.validate(value)) {
              if (verbose)
                console.log('line ' + lineNum + ': invalid  ' + key + ': ' + row[key]);
              value = null;
            }
          }
        }
      }
      if (value == null && map.required) {
        if (verbose)
          console.log('line ' + lineNum + ': required ' + key + ': ' + row[key]);
        if (orig == null)
          value = '';
        else
          value = orig;
        missing = true;
      }
      if (value != null) {
        if (typeof value == 'number' || typeof value == 'boolean')
          cols[map.toField] = String(value);
        else
          cols[map.toField] = "'" + value.replace(/'/g, "''") + "'";

        if (key == 'EngineCode') {
          let common, m;
          if (/^MicroMaxx/.test(value))
            common = value;
          else if (m = /^\d*([a-z])([1-9][0-9]*).*$/i.exec(value))
            common = m[1] + m[2];
          else if (m = /^(.*[^a-z])?([a-z])[ -]?([1-9][0-9]*).*$/i.exec(value))
            common = m[2] + m[3];
          if (common != null)
            cols.common_name = "'" + common + "'";
        }
      }
    });
    if (missing) {
      cols.status = "'rejected'";
      rejected++;
    } else
      cols.status = "'accepted'";
    out.write('insert into reports (');
    Object.keys(cols).forEach((c, i) => {
      if (i > 0)
        out.write(', ');
      out.write(c);
    });
    out.write(')\nvalues (');
    Object.keys(cols).forEach((c, i) => {
      if (i > 0)
        out.write(', ');
      out.write(cols[c]);
    });
    out.write(');\n');
    total++;
  })
  .on('end', () => {
    out.close();
    console.log(total + ' records read (' + rejected + ' rejected); output in ' + outfile);
  });

