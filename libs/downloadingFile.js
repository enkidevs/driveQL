const request = require('request');
const fs = require('fs');

module.exports.downloadGoogleSpreadsheet = (token, fileToDownload, callback) => {
  const cleanTitle = fileToDownload.title
    .replace(/ /g, '_')
    .replace(/\./g, '_')
    .replace(/\//g, '_');
  const file = fs.createWriteStream(
    '.cached_files/' + cleanTitle + '.xlsx'
  );
  request(fileToDownload.exportLinks.officedocument
  , {
    'auth': {
      'bearer': token.accessToken,
    },
  }).pipe(file);

  file.on('finish', callback);
};
