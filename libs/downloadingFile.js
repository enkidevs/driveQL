var request = require('request');
var fs = require('fs');

module.exports.downloadGoogleSpreadsheet = (token, fileToDownload, callback) => {
  var cleanTitle = fileToDownload.title.replace(/ /g, '_');
  var file = fs.createWriteStream(
    '.cached_files/' + cleanTitle + '.xlsx'
  );
  request(fileToDownload.exportLinks['officedocument']
  , {
    'auth': {
      'bearer': token.accessToken
    }
  }).pipe(file);
}
