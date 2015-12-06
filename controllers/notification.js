var User = require('../models/User');
var {downloadGoogleSpreadsheet} = require('../libs/downloadingFile');

/**
 * POST /notification
 * receive a notification that one of the files has been changed.
 */
exports.postNotification = function(req, res, next) {
  console.log('req:', req);

  var uidArr = req.headers['x-goog-channel-id'].split('__user:');
  var userId = uidArr[1];
  var fileId = uidArr[0].replace(/^file:/, '');

  var user = User.findById(userId, function(err, user) {
    if (err) {
      console.log(err);
    }
  });
  var token = _.find(user.tokens, { kind: 'google' });
  var file = req.user.googleFiles.find(f => f.id === fileId);

  downloadGoogleSpreadsheet(token, file, () => {
    genSchema();
    console.log('done')
  });
  
  user.apiFiles = user.apiFiles.map(f => f.id === fileId ? file : f);

  res.status(200).send('OK');

}
