const xlsx = require('xlsx');
const fs = require('fs');


function parseCsv(path, sep) {
  const data = fs.readFileSync(path).toString().split('\n');
  const header = data.shift().split(sep);
  const results = [];
  data.forEach(row => {
    if (!row.trim().length) {return;}
    var res = {};
    row.split(sep).forEach((val, i) => {
      var k = header[i].replace('\r','');
      var v = val.replace('\r','');
      res[k] = v;
    })
    results.push(res);
  })
  return {'data': results}
}

module.exports.parseFile = function(path) {

 const extension = path.split('.').reverse()[0];
 if (extension === 'csv') {
   return parseCsv(path, ',')
 }
 if (extension === 'tsv') {
   return parseCsv(path, '\t')
 }
 const data = xlsx.readFile(path);
 const sheets = data.SheetNames;
 const res = {};
 sheets.forEach(sheetName => {
   res[sheetName] = xlsx.utils.sheet_to_json(data.Sheets[sheetName])
 });
 return res;
}
