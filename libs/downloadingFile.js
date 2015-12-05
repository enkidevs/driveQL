var request = require('request');
var fs = require('fs');

module.exports.downloadGoogleSpreadsheet = (token, fileToDownload, callback) => {
  var file = fs.createWriteStream(
    '.cached_files/' + fileToDownload.title + '.xlsx'
  );
  request(fileToDownload.exportLinks['officedocument']
  , {
    'auth': {
      'bearer': token.accessToken
    }
  }).pipe(file);
}
