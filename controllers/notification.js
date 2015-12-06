const User = require('../models/User');
const {downloadGoogleSpreadsheet} = require('../libs/downloadingFile');
const _ = require('lodash');
const {genSchema} = require('../libs/genSchema');

/**
 * POST /notification
 * receive a notification that one of the files has been changed.
 */

exports.postNotification = function postNotification(req, res) {
  console.log('req:', req);

  const uidArr = req.headers['x-goog-channel-id'].split('__user--');
  const channelId = req.headers['x-goog-resource-id'];
  const userId = uidArr[1];
  const fileId = uidArr[0].replace(/^file--/, '');

  console.log('\n\n\n\nuserID: ', userId);
  console.log('\n\n\n\nfileID: ', fileId);

  User.findById(userId, (err, user) => {
    if (err || !user) {
      console.log(err);
      res.status(200).send('OK');
      return;
    }
    const token = _.find(user.tokens, { kind: 'google' });
    const file = user.apiFiles.find(f => f.id === fileId);
    file.channelId = channelId;

    downloadGoogleSpreadsheet(token, file, () => {
      genSchema();
      console.log('done');
    });

    user.apiFiles = user.apiFiles.map(f => f.id === fileId ? file : f);
    user.save();

    res.status(200).send('OK');
  });
};
