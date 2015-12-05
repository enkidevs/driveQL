var request = require('request');
var fs = require('fs');

module.exports.downloadGoogleSpreadsheet = (token, file, callback) => {
  var file = fs.createWriteStream(file.id + ".xlsx");
  var request = request(file.exportLinks['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  , {
    'auth': {
      'bearer': token.accessToken
    }
  }).pipe(file);
}
