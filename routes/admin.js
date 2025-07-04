const express = require('express'),
      router = express.Router(),
      moment = require('moment'),
      crypto = require('crypto'),
      bcrypt = require('bcrypt'),
      sgMail = require('@sendgrid/mail'),
      multer = require('multer'),
      { LargeObjectManager } = require('pg-large-object'),
      quoteSqlStr = require('./util.js').quoteSqlStr,
      originURL = require('./util.js').originURL,
      formatDateISO = require('./util.js').formatDateISO,
      formatDateLocal = require('./util.js').formatDateLocal,
      rowId = require('./util.js').rowId,
      isEmpty = require('./util.js').isEmpty,
      nonEmpty = require('./util.js').nonEmpty;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const upload = multer({
  dest: '/tmp/',
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/*
 * Login required for all admin pages, except login and forgotten password pages.
 */
function loginProps(req, from) {
  let props = {
    title: 'Administrator Login',
    errors: [],
    submitted: false,
  }
  if (from != null && from != '')
    props.from = from;
  else
    props.from = '/';
  return props;
}

function loginPage(req, res, next, from) {
  res.render('admin/login', loginProps(req, from));
};

const PublicPages = [ '/login', '/forgot', '/reset' ];

router.all('*', function(req, res, next) {
  let base = req.url.replace(/[#?].*$/, '');
  if (PublicPages.indexOf(base) < 0 && (!req.session || !req.session.authenticated)) {
    loginPage(req, res, next, req.baseUrl + req.url);
  } else
    next();
});

router.get('/', function(req, res, next) {
  let select = "select count(*) from reports where status = 'pending'";
  req.pool.query(select, (err, q) => {
    if (err)
      return next(err);

    let count = q.rows[0].count;
    res.render('admin/admin', {
      title: 'Site Administration',
      pending_count: count,
    });
  });
});

router.get('/login', function(req, res, next) {
  loginPage(req, res, next);
});

router.post('/login', function(req, res, next) {
  let email = req.body.email,
      passwd = req.body.password,
      props = loginProps(req);

  props.submitted = true;
  if (email == null || email === '' || passwd == null || passwd === '') {
    props.errors.push('Both email address and password must be specified.');
    res.render('admin/login', props);
  } else {
    let select = "select id, passwd from admins where email = " + quoteSqlStr(email) + " and enabled";
    req.pool.query(select, (err, q) => {
      if (err)
        return next(err);

      let record = q.rows.length > 0 ? q.rows[0] : { passwd: '*' };
      bcrypt.compare(passwd, record.passwd, (err, match) => {
        if (err)
          next(err);

        if (match) {
          req.session.authenticated = true;
          req.session.admin_id = record.id;
          let dest = req.body.from == null || req.body.from === '' ? '/admin' : req.body.from;
          res.redirect(302, dest);
        } else {
          setTimeout(() => {
            props.errors.push('Invalid email address and password.');
            res.render('admin/login', props);
          }, 1000);
        }
      });
    });
  }
});

/*
 * Password reset flow:
 * /admin/forgot
 * /admin/reset
 */
function forgotProps(req) {
  return {
    title: 'Forgot Password',
    errors: [],
    submitted: false,
  };
}

router.get('/forgot', function(req, res, next) {
  res.render('admin/forgot', forgotProps(req));
});

router.post('/forgot', function(req, res, next) {
  let email = req.body.email,
      props = forgotProps(req);

  props.submitted = true;
  if (email == null || email === '') {
    props.errors.push('Your registered email address must be specified.');
    res.render('admin/forgot', props);
  } else {
    let select = "select id from admins where email = " + quoteSqlStr(email) + " and enabled";
    req.pool.query(select, (err, q) => {
      if (err)
        return next(err);

      props.email = email;
      if (q.rows.length == 1) {
        let token = crypto.randomBytes(16).toString('hex');
        let update = ("update admins" +
                      " set reset_token = " + quoteSqlStr(token) +
                      ", reset_expires = now() + interval '1 hour'" +
                      " where id = " + q.rows[0].id);
        req.pool.query(update, (err, q) => {
          if (err)
            return next(err);

          let url = originURL(req) + '/admin/reset?email=' + encodeURIComponent(email) + '&token=' + token;
          sgMail.send({
            to: email,
            from: 'motorcato.org <noreply@motorcato.org>',
            subject: 'motorcato.org password reset',
            text: `You (or perhaps someone else) submitted a request to reset your password on motorcato.org.
If this was you, please follow the link below to reset your password.
If not, just ignore this message; your account is safe.

 ${url}

You must be a registered administrator of motorcato.org.
If you aren't part of the Malfunctioning Engine Statistical Survey, please ignore this message.
Do not reply to this email; it was sent automatically.

Malfunctioning Engine Statistical Survey • PO Box 407 • Marion, IA 52302`
          }).then(() => res.render('admin/forgot', props))
            .catch(e => next(e));
        });
      } else {
        res.render('admin/forgot', props);
      }
    });
  }
});

function resetProps(req) {
  return {
    title: 'Reset Password',
    errors: [],
    submitted: false,
  };
}

function resetSelect(email, token) {
  return ("select id from admins where email = " + quoteSqlStr(email) +
          " and reset_token = " + quoteSqlStr(token) +
          " and reset_expires >= now()" +
          " and enabled");
}

router.get('/reset', function(req, res, next) {
  let email = req.query.email,
      token = req.query.token,
      props = resetProps(req);

  if (email == null || email === '' || token == null || token === '') {
    props.errors.push('Please use the full URL sent in the password reset email.');
    return res.render('admin/forgot', props);
  }

  req.pool.query(resetSelect(email, token), (err, q) => {
    if (err)
      return next(err);

    if (q.rows.length != 1) {
      props.errors.push('Password reset expired.');
      res.render('admin/forgot', props);
    } else {
      props.email = email;
      props.token = token;
      res.render('admin/reset', props);
    }
  });
});

router.post('/reset', function(req, res, next) {
  let email = req.body.email,
      token = req.body.token,
      passwd1 = req.body.password1,
      passwd2 = req.body.password2,
      props = resetProps(req);

  if (email == null || email === '' || token == null || token === '') {
    props.errors.push('Please use the full URL sent in the password reset email.');
    return res.render('admin/forgot', props);
  }
  props.email = email;
  props.token = token;

  if (passwd1 == null || passwd1 === '' || passwd2 == null || passwd2 === '') {
    props.errors.push('Please enter your new password (twice).');
    return res.render('admin/reset', props);
  }
  if (passwd1 != passwd2) {
    props.errors.push('Passwords do not match.');
    return res.render('admin/reset', props);
  }

  req.pool.query(resetSelect(email, token), (err, q) => {
    if (err)
      return next(err);

    if (q.rows.length != 1) {
      props.errors.push('Password reset expired.');
      res.render('admin/forgot', props);
    } else {
      bcrypt.hash(passwd1, 10, (err, hash) => {
        if (err)
          return next(err);

        let update = ("update admins set passwd = " + quoteSqlStr(hash) +
                      ", reset_token = null, reset_expires = null" +
                      " where id = " + q.rows[0].id);
        req.pool.query(update, (err, q) => {
          if (err)
            return next(err);

          res.redirect(302, "/admin/login");
        });
      });
    }
  });
});

/*
 * Reject a failure report.
 */
router.get('/reject', function(req, res, next) {
  let id = req.query.id;
  if (id == null || id === '' || !/^\d+$/.test(id)) {
    res.redirect(302, "/search?notfound");
  } else {
    let update = "update reports set status = 'rejected' where id = " + id;
    req.pool.query(update, (err, q) => {
      if (err)
        return next(err);

      res.redirect(302, "/search?id=" + id);
    });
  }
});

/*
 * Accept a failure report.
 */
router.get('/accept', function(req, res, next) {
  let id = req.query.id;
  if (id == null || id === '' || !/^\d+$/.test(id)) {
    res.redirect(302, "/search?notfound");
  } else {
    let update = "update reports set status = 'accepted' where id = " + id;
    req.pool.query(update, (err, q) => {
      if (err)
        return next(err);

      res.redirect(302, "/search?id=" + id);
    });
  }
});


/*
 * Document management routes.
 * /admin/documents list
 * /admin/document/add upload
 */
function documentProps(req) {
  return {
    title: "Manage Documents",
    errors: [],
  };
}

router.get('/documents', function(req, res, next) {
  let props = documentProps(req);
  req.pool.query("select * from documents order by filename", (err, q) => {
    if (err)
      return next(err);

    props.existing = [];
    if (q.rows) {
      q.rows.forEach(r => {
        props.existing.push({
          id: r.id,
          filename: r.filename,
          content_type: r.content_type,
        });
      });
    }
    res.render('admin/documents', props);
  });
});

router.get('/document/add', function(req, res, next) {
  res.render('admin/document-add', documentProps());
});

router.post('/document/add', upload.single('file'), function(req, res, next) {
  let props = documentProps(req);

  if (req.file == null || req.file.originalname == null || req.file.mimetype != 'application/pdf') {
    props.errors.push('Please select a PDF file to upload.');
    return res.render('admin/document-add', props);
  }

  req.pool.connect((err, client, release) => {
    if (err)
      return next(err);

    const lom = new LargeObjectManager({ pg: client });
    client.query('begin', (err, tx) => {
      if (err) {
        release(err);
        return next(err);
      }

      lom.createAndWritableStream(2048 * 8, (err, oid, ostream) => {
        if (err) {
          release(err);
          return next(err);
        }

        ostream.on('finish', (err) => {
          client.query("insert into documents (filename, content_type, content_oid, uploaded_by)" +
                       " values ($1, $2, $3, $4)",
                       [req.file.originalname, req.file.mimetype, oid, req.session.admin_id],
                       (err, q) => {
                         if (err) {
                           release(err);
                           return next(err);
                         }
                         client.query('commit', release);
                         res.redirect(302, '/admin/documents');
                       });
        });
        var istream = require('fs').createReadStream(req.file.path);
        istream.pipe(ostream)
               .on('error', err => {
                 release(err);
                 next(err);
               });
      });
    });
  });
});


/*
 * Notification management routes.
 * /admin/notifications list
 * /admin/notification/id edit
 */
function notificationProps(req) {
  return {
    title: "Manage Notifications",
    errors: [],
  };
}

function queryDocuments(req) {
  return new Promise((resolve, reject) => {
    req.pool.query("select filename from documents order by 1", (err, q) => {
      if (err)

        return reject(err);
      let docs = [];
      if (q.rows)
        q.rows.forEach(r => docs.push(r.filename));
      resolve(docs);
    });
  });
}

router.get('/notifications', function(req, res, next) {
  let props = notificationProps(req);
  req.pool.query("select * from notifications order by date desc", (err, q) => {
    if (err)
      return next(err);

    props.existing = [];
    if (q.rows) {
      q.rows.forEach(r => {
        props.existing.push({
          id: r.id,
          date_iso: formatDateISO(r.date),
          date_local: formatDateLocal(req, r.date),
          headline: r.headline,
          expired: r.expired,
        });
      });
    }
    res.render('admin/notifications', props);
  });
});

router.get('/notification/add', function(req, res, next) {
  let props = notificationProps(req);
  props.add = true;
  let now = new Date();
  props.date_iso = formatDateISO(now);
  props.date_local = formatDateLocal(req, now);
  queryDocuments(req)
    .then(d => {
      props.documents = d;
      res.render("admin/notification-edit", props);
    })
    .catch(e => next(e));
});

router.post('/notification/add', function(req, res, next) {
  let props = notificationProps(req);
  props.add = true;
  props.date_iso = formatDateISO(new Date());
  updateNotification(props, req, res, next);
});

router.get('/notification/:id', function(req, res, next) {
  let props = notificationProps(req);
  props.add = false;
  let id = rowId(req.params.id);
  req.pool.query("select * from notifications where id = " + id, (err, q) => {
    if (err)
      return next(err);

    if (q.rows && q.rows.length == 1) {
      let r = q.rows[0];
      props.id = r.id;
      props.date_iso = formatDateISO(r.date);
      props.date_local = formatDateLocal(req, r.date);
      props.headline = r.headline;
      props.url = r.url;
      props.document_name = r.document_name;
      props.body = r.body;
      props.expired = r.expired;
    } else {
      props.not_found = true;
      props.errors.push('Notification not found.');
    }
    queryDocuments(req)
      .then(d => {
        props.documents = d;
        res.render("admin/notification-edit", props);
      })
      .catch(e => next(e));
  });
});

router.post('/notification/:id', function(req, res, next) {
  let id = rowId(req.params.id);
  if (id < 0)
    return res.redirect(302, '/admin/notifications');

  let props = notificationProps(req);
  props.id = id;
  props.add = false;
  updateNotification(props, req, res, next);
});

function updateNotification(props, req, res, next) {
  let failed = false;

  let date = moment(req.body.date, 'YYYY-M-D');
  if (date == null || !date.isValid()) {
    props.errors.push('Please enter the date on which the notification was posted.');
    failed = true;
  } else
    props.date_iso = formatDateISO(date);

  let headline = nonEmpty(req.body.headline);
  if (headline == null) {
    props.errors.push('Please enter a headline, displayed on the home page.');
    failed = true;
  }
  else
    props.headline = headline;

  let document_name = props.document_name = nonEmpty(req.body.document_name);
  let url = props.url = nonEmpty(req.body.url);
  let body = props.body = nonEmpty(req.body.body);
  if (document_name == null && url == null && body == null) {
    props.errors.push('Please pick a document, enter a URL or body text to display.');
    failed = true;
  }

  let expired = props.expired = nonEmpty(req.body.expired) != null;

  if (failed) {
    queryDocuments(req)
      .then(d => {
        props.documents = d;
        res.render("admin/notification-edit", props);
      })
      .catch(e => next(e));
  } else {
    let query, values;
    if (props.add) {
      query = ("insert into notifications (date, headline, document_name, url, body, posted_by, expired)\n" +
               " values ($1, $2, $3, $4, $5, $6, $7)");
      values = [date, headline, document_name, url, body, req.session.admin_id, expired];
    } else {
      query = ("update notifications\n" +
               " set date = $1,\n" +
               "     headline = $2,\n" +
               "     document_name = $3,\n" + 
               "     url = $4,\n" +
               "     body = $5,\n" +
               "     expired = $6\n" +
               " where id = $7");
      values = [date, headline, document_name, url, body, expired, props.id];
    }
    req.pool.query(query, values, (err, q) => {
      if (err)
        return next(err);

      res.redirect(302, '/admin/notifications');
    });
  }
}

/*
 * Invite admin route.
 */
function inviteProps(req) {
  return {
    title: "Invite Administrator",
    errors: [],
  };
}

router.get('/invite', function(req, res, next) {
  res.render("admin/invite", inviteProps(req));
});

router.post('/invite', function(req, res, next) {
  let email = req.body.email,
      props = inviteProps(req);

  props.submitted = true;
  if (email == null || email === '') {
    props.errors.push('A valid email address must be specified.');
    res.render('admin/invite', props);
  } else {
    let select = "select id, enabled from admins where email = " + quoteSqlStr(email);
    req.pool.query(select, (err, q) => {
      if (err)
        return next(err);

      if (q.rows && q.rows.length > 0) {
        props.errors.push('That email address is already registered.');
        res.render('admin/invite', props);
      } else {
        let token = crypto.randomBytes(16).toString('hex');
        let insert = ("insert into admins (email, passwd, enabled, reset_token, reset_expires)" +
                      " values (" + quoteSqlStr(email) +
                      ", '!', true, " + quoteSqlStr(token) +
                      ", now() + interval '48 hour')");
        req.pool.query(insert, (err, q) => {
          if (err)
            return next(err);

          let url = originURL(req) + '/admin/reset?email=' + encodeURIComponent(email) + '&token=' + token;
          sgMail.send({
            to: email,
            from: 'motorcato.org <noreply@motorcato.org>',
            subject: 'motorcato.org administrator invitation',
            text: `You have been invited to be an adminstrator of motorcato.org.
If you are expecting this, please follow the link below to reset your password.
If not, just ignore this message.

 ${url}

You must be a registered administrator of motorcato.org.
If you aren't part of the Malfunctioning Engine Statistical Survey, please ignore this message.
Do not reply to this email; it was sent automatically.

Malfunctioning Engine Statistical Survey • PO Box 407 • Marion, IA 52302`
          }).then(() => {
            props.sent = true;
            res.render('admin/invite', props);
          }).catch(e => next(e));
        });
      }
    });
  }
});

module.exports = router;
