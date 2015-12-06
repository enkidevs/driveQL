/**
 * Split into declaration and initialization for better startup performance.
 */
const User = require('../models/User');
const _ = require('lodash');
const refresh = require('passport-oauth2-refresh');

const secrets = require('../config/secrets');
const google = require('googleapis');
const fs = require('fs');
const {guid} = require('../libs/guid');
const {downloadGoogleSpreadsheet} = require('../libs/downloadingFile');
const {genSchema} = require('../libs/genSchema');

/**
 * GET /api/files
 */
function getGoogleFiles(req, res, next) {
  const token = _.find(req.user.tokens, { kind: 'google' });
  let retries = 2;
  const OAuth2 = google.auth.OAuth2;

  function makeRequest() {
    retries--;
    if (!retries) {
      // Couldn't refresh the access token.
      return res.status(401).end();
    }
    const oauth2Client = new OAuth2(
      secrets.google.clientID,
      secrets.google.clientSecret,
      secrets.google.callbackURL
    );
    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });

    const drive = google.drive({ version: 'v2', auth: oauth2Client });

    drive.files.list({
      q: 'mimeType = \'application/vnd.google-apps.spreadsheet\'',
    }, (err, result) => {
      if (err) {
        if (err.code === 401) {
          refresh.requestNewAccessToken('google', token.refreshToken, (err2, accessToken) => {
            if (err2 || !accessToken) { return res.status(401).end(); }
            token.accessToken = accessToken;
            // Save the new accessToken for future use
            User.findById(req.user, (_err, user) => {
              user.tokens = user.tokens.map(t => {
                if (t.kind === 'google') {
                  return { kind: 'google', accessToken, refreshToken: t.refreshToken };
                }
                return t;
              });
              user.save(makeRequest);
            });
          });
          return;
        }
        next(err);
        return;
      }
      User.findById(req.user.id, (err2, user) => {
        if (err2) {
          return next(err2);
        }
        user.googleFiles = result.items.map(f => {
          if (f.exportLinks) {
            f.exportLinks = {
              officedocument: f.exportLinks['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            };
          }

          return f;
        });
        user.save((err3) => {
          if (err3) {
            return next(err3);
          }
          res.render('files/files', {
            files: result.items.map(file => {
              if (user.apiFiles.find(f => f.id === file.id)) {
                file.synced = true;
              }
              file.cleanTitle =
                file.title.replace(/ /g, '_')
                       .replace(/\./g, '_');
              return file;
            }),
          });
        });
      });
    });
  }
  makeRequest();
}

exports.getGoogleFiles = getGoogleFiles;


exports.getSyncedFiles = function getSyncedFiles(req, res, next) {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      return next(err);
    }
    return res.render('files/synced',
      {apiFiles: user.apiFiles.map(f => {
        f.cleanTitle =
          f.title.replace(/ /g, '_')
                 .replace(/\./g, '_');
        return f;
      })}
    );
  });
};

function deleteCachedFile(file) {
  const cleanTitle = file.title.replace(/ /g, '_');
  try {
    fs.unlinkSync(
      '.cached_files/' + cleanTitle + '.xlsx'
    );
  } catch (e) {
    console.log(e);
  }
  // TODO: STOP WATCHING FOR CHANGES TO THIS FILE
}

exports.unsyncFile = function unsyncFile(req, res, next) {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      return next(err);
    }
    user.apiFiles = user.apiFiles.filter(
      f => {
        if (f.id === req.params.id) {
          deleteCachedFile(f);
          return false;
        }
        return true;
      }
    );
    user.save();
    return res.render('files/synced',
      {apiFiles: user.apiFiles}
    );
  });
};


exports.unsyncFileFromFullList = function unsyncFileFromFullList(req, res, next) {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      return next(err);
    }
    user.apiFiles = user.apiFiles.filter(
      f => {
        if (f.id === req.params.id) {
          deleteCachedFile(f);
          return false;
        }
        return true;
      }
    );
    user.save(() => {
      return getGoogleFiles(req, res, next);
    });
  });
};


/**
 * GET /api/file
 */
exports.getGoogleFile = function getGoogleFile(req, res, next) {
  const fileId = req.params.file;
  const file = req.user.googleFiles.find(f => f.id === fileId);
  if (!file) { return next(new Error('no file with this id')); }
  const OAuth2 = google.auth.OAuth2;
  const token = _.find(req.user.tokens, { kind: 'google' });


  downloadGoogleSpreadsheet(token, file, () => {
    genSchema();
    console.log('done')
  });

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
  var resource = {
    'id': 'file--' + file.id + '__user--' + req.user.id,
    'type': 'web_hook',
    'address': 'https://driveql.herokuapp.com/notification'
  }
  var watchReq = drive.files.watch({
    'fileId': file.id,
    'resource': resource
  }, function(err, res) {
    if (err) { console.log('error on watch:', err); }
    else { console.log('watch result:', res); }
  });


  User.findById(req.user.id, function(err, user) {
    if (err) {
      return next(err);
    }
    user.apiFiles.push(file);

    user.save(() => {
      return getGoogleFiles(req, res, next)
      // res.render('api/file', {
      //   file,
      // });
    })
  })
  return;

  res.render('files/file', {
    file,
  });
};
