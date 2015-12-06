const _ = require('lodash');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const refresh = require('passport-oauth2-refresh');

const secrets = require('./secrets');
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

/**
 * OAuth Strategy Overview
 *
 * - User is already logged in.
 *   - Check if there is an existing account with a provider id.
 *     - If there is, return an error message. (Account merging not supported)
 *     - Else link new OAuth account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and we are done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, return an error message.
 *       - Else create a new account.
 */

/**
 * Sign in with Google.
 */
const googleStrategy = new GoogleStrategy(secrets.google, (req, accessToken, refreshToken, profile, done) => {
  if (req.user) {
    User.findOne({ google: profile.id }, (_err, existingUser) => {
      if (existingUser) {
        existingUser.tokens = existingUser.tokens.map(t => {
          if (t.kind === 'google') {
            return { kind: 'google', accessToken, refreshToken };
          }
          return t;
        });
        req.user = existingUser;
        existingUser.save((err) => done(err, existingUser));
        return;
      }
      User.findById(req.user.id, (err, user) => {
        user.google = profile.id;
        user.tokens.push({ kind: 'google', accessToken, refreshToken });
        user.profile.name = user.profile.name || profile.displayName;
        user.profile.gender = user.profile.gender || profile._json.gender;
        user.profile.picture = user.profile.picture || profile._json.image.url;
        user.save((saveErr) => {
          req.flash('info', { msg: 'Google account has been linked.' });
          done(saveErr, user);
        });
      });
    });
  } else {
    User.findOne({ google: profile.id }, (_err, existingUser) => {
      if (existingUser) {
        existingUser.tokens = existingUser.tokens.map(t => {
          if (t.kind === 'google') {
            return { kind: 'google', accessToken, refreshToken };
          }
          return t;
        });
        req.user = existingUser;
        existingUser.save((err) => done(err, existingUser));
        return;
      }
      User.findOne({ email: profile.emails[0].value }, (err, existingEmailUser) => {
        if (existingEmailUser) {
          req.flash('errors', { msg: 'There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.' });
          done(err);
        } else {
          const user = new User();
          user.email = profile.emails[0].value;
          user.google = profile.id;
          user.tokens.push({ kind: 'google', accessToken, refreshToken });
          user.profile.name = profile.displayName;
          user.profile.gender = profile._json.gender;
          user.profile.picture = profile._json.image.url;
          user.save((saveErr) => {
            done(saveErr, user);
          });
        }
      });
    });
  }
});

passport.use(googleStrategy);
refresh.use(googleStrategy);

/**
 * Login Required middleware.
 */
exports.isAuthenticated = function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

/**
 * Authorization Required middleware.
 */
exports.isAuthorized = function isAuthorized(req, res, next) {
  return next();
};
