const express = require('express'),
      router = express.Router(),
      crypto = require('crypto'),
      bcrypt = require('bcrypt'),
      sgMail = require('@sendgrid/mail'),
      quoteSqlStr = require('./util.js').quoteSqlStr,
      originURL = require('./util.js').originURL;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
  res.render('admin/admin', {
    title: 'Site Administration',
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
    let select = "select passwd from admins where email = " + quoteSqlStr(email) + " and enabled";
    req.pool.query(select, (err, q) => {
      if (err)
        return next(err);

      let record = q.rows.length > 0 ? q.rows[0] : { passwd: '*' };
      bcrypt.compare(passwd, record.passwd, (err, match) => {
        if (err)
          next(err);

        if (match) {
          req.session.authenticated = true;
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
          });
          
          res.render('admin/forgot', props);
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
 * Reject a failure report
 */
router.get('/reject', function(req, res, next) {
  let id = req.query.id;
  if (id == null || id === '' || !/^\d+$/.test(id)) {
    res.redirect(302, "/search?notfound");
  } else {
    let update = "update reports set rejected = true where id = " + id;
    req.pool.query(update, (err, q) => {
      if (err)
        return next(err);

      res.redirect(302, "/search?id=" + id);
    });
  }
});

module.exports = router;
