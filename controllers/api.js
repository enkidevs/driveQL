/**
 * Split into declaration and initialization for better startup performance.
 */
var User = require('../models/User');
var _ = require('lodash');
var async = require('async');
var querystring = require('querystring');

var secrets = require('../config/secrets');
var google = require('googleapis');
var {downloadGoogleSpreadsheet} = require('../libs/downloadingFile');

/**
* GET /api
* List of API examples.
*/
exports.getApi = function(req, res) {
 res.render('api/index', {
   title: 'API Examples'
 });
};

/**
 * GET /api/files
 */
exports.getGoogleFiles = function(req, res, next) {
  var token = _.find(req.user.tokens, { kind: 'google' });
  var OAuth2 = google.auth.OAuth2;
  var oauth2Client = new OAuth2(
    secrets.google.clientID,
    secrets.google.clientSecret,
    secrets.google.callbackURL
  );
  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
  });

  var drive = google.drive({ version: 'v2', auth: oauth2Client });

  drive.files.list({
    q: 'mimeType = \'application/vnd.google-apps.spreadsheet\''
  }, function(err, result) {
    if (err) {
      return next(err);
    }
    User.findById(req.user.id, function(err, user) {
      if (err) {
        return next(err);
      }
      user.googleFiles = result.items.map(f => {
        if (f.exportLinks) {
          f.exportLinks = {
            officedocument: f.exportLinks['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
          }
        }
        return f;
      });
      user.save((err) => {
        if (err) {
          return next(err);
        }
        res.render('api/files', {
          files: result.items,
        });
      });
    });
  });
};

/**
 * GET /api/file
 */
exports.getGoogleFile = function(req, res, next) {
  var fileId = req.params.file;
  var file = req.user.googleFiles.find(f => f.id === fileId);
  if (!file) { return next(new Error('no file with this id')); }
  var token = _.find(req.user.tokens, { kind: 'google' });

  downloadGoogleSpreadsheet(token, file, () => {
    console.log('done')
  });
  res.render('api/file', {
    file,
  });
};
