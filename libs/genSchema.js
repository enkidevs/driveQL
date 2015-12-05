var GraphQLObjectType = require('graphql').GraphQLObjectType;
var GraphQLSchema = require('graphql').GraphQLSchema;
var GraphQLInt = require('graphql').GraphQLInt;
var GraphQLString = require('graphql').GraphQLString;

let count = 0;


// http://stackoverflow.com/questions/10834796/validate-that-a-string-is-a-positive-integer
function isNormalInteger(str) {
    var n = ~~Number(str);
    return String(n) === str && n >= 0;
}

function sanitize(name) {
  return name.replace(/\./g, '_').replace(/\//g, '_');
}

function schemaFromArrayOfObjects(name, data) {
  var firstRow = data[0];
  var fieldsFromData = {};
  // inferring types (Int or String) from first row
  Object.keys(firstRow).forEach(fieldName => {
    var val = firstRow[fieldName];
    fieldsFromData[fieldName] = {
      type: isNormalInteger(val) ? GraphQLInt : GraphQLString,
      description: 'Example value: ' + val,
      resolve: (row) => row[fieldName]
    }
  });
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: sanitize(name),
      fields: () => fieldsFromData,
    })
  })
}

function schemaFromSpreadSheet(name, obj) {
  var fieldsFromData = {};
  Object.keys(obj).forEach(sheetName => {
    fieldsFromData[sheetName] = {
      type: schemaFromArrayOfObjects(sheetName, obj[sheetName]),
      description: sheetName + ' sheet',
      resolve: (root, {sname}) => obj[sname],
    }
  });
  return new GraphQLObjectType({
    name: sanitize(name),
    description: 'File ' + name,
    fields: () => fieldsFromData,
  })
}

module.exports.schemaFromSpreadSheet = schemaFromSpreadSheet;
