const parseFile = require('../libs/parsing.js').parseFile;
const schemaFromSpreadSheet = require('../libs/genSchema.js').schemaFromSpreadSheet;

function test(path) {
  console.log('testing schema generation for ' + path + ':')
  var data  = parseFile(path)
  console.log(schemaFromSpreadSheet(path, data));
}

test('../fixtures/TestTables.ods');
test('../fixtures/TestTables.xlsx');
test('../fixtures/TestTables.emails.csv');
test('../fixtures/TestTables.emails.tsv');
