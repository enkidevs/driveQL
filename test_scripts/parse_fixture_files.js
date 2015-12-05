const parseFile = require('../libs/parsing.js').parseFile;

function test(path) {
  console.log(path + ':')
  console.log(JSON.stringify(parseFile(path), null, 2));
}

test('../fixtures/TestTables.ods');
test('../fixtures/TestTables.xlsx');
test('../fixtures/TestTables.emails.csv');
test('../fixtures/TestTables.emails.tsv');
