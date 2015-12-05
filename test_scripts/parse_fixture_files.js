const parseFile = require('../libs/parsing.js').parseFile;

function test(path) {
  console.log(path + ':')
  console.log(parseFile(path));
}

test('../fixtures/TestTables.ods');
test('../fixtures/TestTables.xlsx');
test('../fixtures/TestTables.emails.csv');
test('../fixtures/TestTables.emails.tsv');
