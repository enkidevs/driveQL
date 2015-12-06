/**
 * POST /notifications
 * receive a notification that one of the files has been changed.
 */
exports.postNotification = function(req, res) {
  console.log('req:', req);
  res.status(200).send('OK');
}
