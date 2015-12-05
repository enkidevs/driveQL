var GoogleSpreadsheet = require("google-spreadsheet");
var bluebird = require("bluebird");

const {
  Promise
} = bluebird;

const {
  promisify
} = Promise;

let rowProp = 'a';
let colProp = 'b';


/**
 @param {String} token Gogole Token
 @param {String} id sheet id
 */
export default function(id) {
  var spreadsheet = new GoogleSpreadsheet(id);
  var tokentype = "Bearer";
  // for authentication:
  //
  // spreadsheet.setAuthToken({
  //   value: token,
  //   type: tokentype
  // });
  return promisify(spreadsheet.getInfo)().then(function(sheet_info) {
    // sheet_info.worksheets == [{ id: 'od6',
    //                title: 'users',
    //                rowCount: '1000',
    //                colCount: '26',
    //                getRows: [Function],
    //                getCells: [Function],
    //                addRow: [Function] }, ... ]
    return Promise.all(sheet_info.worksheets.map((sheet) => {
      return promisify(sheet.getCells)().then(function(x) {
        return {
          name: sheet.title,
          contents: cellsToJson(x)
        }
      })
    }));
  });
}


/**
 @param cells e.g. [{row:1, col:1, value: 'id'}, {row:1, col:2, value: 'name'}, {row:2, col:1, value: '0'}, ...]
 */
function cellsToJson(cells) {
  let headers = cells.filter((c) => c.row === 1);
  let headerNames = headers.map((h) => h.value);
  let rowIndex = 1;
  let row = [];
  let result = [];
  while (true) {
    let obj = {}
    row = cells.filter((c) => c.row === rowIndex);
    if (row.length === 0) { break };
    row.forEach((c) => {
      obj[headerNames[c.col]] = c.value;
    });
    result.push(obj)
    ++rowIndex;
  }
  return result;
}
