var request = require('request');
var {guid} = require('../libs/guid');
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

  var uid = guid();  
  var resource = {
    'id': guid(),
    'type': 'web_hook',
    'address': 'https://driveql.herokuapp.com/notifications'
  }
  var watchReq = drive.files.watch({
    'fileId': fileToDownload.id,
    'resource': resource
  }, function(err, res) {console.log('watch result:', res);});

  file.on('finish', function(){
    callback();
  });
}
