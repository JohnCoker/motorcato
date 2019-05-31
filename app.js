const createError = require('http-errors'),
      express = require('express'),
      path = require('path'),
      cookieParser = require('cookie-parser'),
      logger = require('morgan'),
      session = require('express-session'),
      crypto = require('crypto'),
      { Pool } = require('pg');

const connStr = process.env.DATABASE_URL;
if (connStr == null || connStr === '')
  throw new Error('DATABASE_URL environment variable not set!');
const pool = new Pool({
  connectionString: connStr,
  ssl: !/@localhost\//.test(connStr)
});

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// security for admin pages
app.use(session({
  name: 'motorcato.org',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(16).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { secure: 'auto' },
}));

// PostgreSQL pooled connection
app.use(function(req, res, next) {
  req.pool = pool;
  next();
});

app.use('/', require('./routes/index'));
app.use('/', require('./routes/report'));
app.use('/', require('./routes/latest'));
app.use('/', require('./routes/search'));
app.use('/admin', require('./routes/admin'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.render('notfound', { title: 'Page Not Found' });
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
