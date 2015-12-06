require('babel-register');

/**
 * Module dependencies.
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const compress = require('compression');
const favicon = require('serve-favicon');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const errorHandler = require('errorhandler');
const methodOverride = require('method-override');

const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const sass = require('node-sass-middleware');


/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const featuresController = require('./controllers/features');
const userController = require('./controllers/user');
const filesController = require('./controllers/files');
const notificationController = require('./controllers/notification');

/**
 * API keys and Passport configuration.
 */
const secrets = require('./config/secrets');
const passportConf = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.connect(secrets.db);
mongoose.connection.on('error', () => {
  console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');
  process.exit(1);
});

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(compress());
app.use(sass({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  debug: true,
  outputStyle: 'expanded',
}));
app.use(logger('dev'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(methodOverride());
app.use(cookieParser());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: secrets.sessionSecret,
  store: new MongoStore({ url: secrets.db, autoReconnect: true }),
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
// app.use(lusca({
//   csrf: true,
//   xframe: 'SAMEORIGIN',
//   xssProtection: true
// }));
app.use(function locals(req, res, next) {
  res.locals.user = req.user;
  next();
});
app.use(function returnTo(req, res, next) {
  if (/api/i.test(req.path)) {
    req.session.returnTo = req.path;
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));


/**
 * Primary app routes.
 */
app.get('/', homeController.index);
app.get('/features', featuresController.index);
app.get('/logout', userController.logout);
app.post('/notification', notificationController.postNotification);

/**
 * API examples routes.
 */
app.get('/files', passportConf.isAuthenticated, passportConf.isAuthorized, filesController.getGoogleFiles);
app.get('/synced', passportConf.isAuthenticated, passportConf.isAuthorized, filesController.getSyncedFiles);
app.get('/unsync/:id', passportConf.isAuthenticated, passportConf.isAuthorized, filesController.unsyncFile);
app.get('/unsyncf/:id', passportConf.isAuthenticated, passportConf.isAuthorized, filesController.unsyncFileFromFullList);
app.get('/file/:file', passportConf.isAuthenticated, passportConf.isAuthorized, filesController.getGoogleFile);


/**
 * OAuth authentication routes. (Sign in)
 */

app.get('/auth/google', passport.authenticate('google', { accessType: 'offline', scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive' }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/files');
});

const gd = require('./controllers/gd');
app.get('/gdoc', gd.default);

const genSchema = require('./libs/genSchema').genSchema;
genSchema();
const graphiqlController = require('./controllers/graphql');
app.use('/graphql', graphiqlController);

/**
 * Error Handler.
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
app.listen(app.get('port'), function listen() {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;
