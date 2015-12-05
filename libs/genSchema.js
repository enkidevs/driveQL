import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList
} from 'graphql';

import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions,
} from 'graphql-relay';

let count = 0;


// http://stackoverflow.com/questions/10834796/validate-that-a-string-is-a-positive-integer
function isNormalInteger(str) {
    var n = ~~Number(str);
    return String(n) === str && n >= 0;
}

var typenames_count = {};

function sanitize(name) {
  let clean = name.replace(/\./g, '_').replace(/\//g, '_');
  if (typenames_count[clean]) {
    typenames_count[clean] = typenames_count[clean] + 1;
    clean = clean + '_' + (typenames_count[clean] - 1);
  } else {
    typenames_count[clean] = 1;
  }
  return clean;
}

function schemaFromArrayOfObjects(name, data, sheetSchemas, getRowFromSheetById) {
  return new GraphQLObjectType({
    name: sanitize(name),
    fields: () => {
      var firstRow = data[0];
      var fieldsFromData = {};
      // inferring types (Int or String) from first row
      Object.keys(firstRow).forEach(fieldName => {
        var val = firstRow[fieldName];
        var type;
        var relation = false;
        var normalizedName = fieldName;
        if (fieldName.slice(fieldName.length - 2, fieldName.length) === 'Id') {
          var sheetName = fieldName.slice(0, -2);
          normalizedName = sheetName;
          type = sheetSchemas[sheetName];
          relation = true;
        } else {
          type = isNormalInteger(val) ? GraphQLInt : GraphQLString;
        }
        fieldsFromData[normalizedName] = {
          type,
          description: 'Example value: ' + val,
          resolve: (row) => {
            if (relation) {
              return getRowFromSheetById(fieldName.slice(0, -2), row[fieldName]);
            }
            return row[fieldName];
          }
        }
      });
      return fieldsFromData;
    },
  });
}

function schemaFromSpreadSheet(name, obj, returnTheTypeOnly) {
  var sheetSchemas = {};
  var fieldsFromData = {};
  Object.keys(obj).reverse().forEach(sheetName => {
    var normalizedName = sheetName.replace(/s$/,'');
    sheetSchemas[normalizedName] = schemaFromArrayOfObjects(normalizedName, obj[sheetName], sheetSchemas,
      (sheet, id) => obj[sheetName].find(r => r.id === id));
    var args = {
      row: {
        type: GraphQLInt,
      },
    };
    var firstRow = obj[sheetName][0];
    var keys = Object.keys(firstRow);
    keys.forEach(key => {
      var val = firstRow[key];
      args[key] = {
        type: isNormalInteger(val) ? GraphQLInt : GraphQLString
      }
    })
    fieldsFromData[normalizedName] = {
      type: sheetSchemas[normalizedName],
      description: sheetName + ' sheet',
      args,
      resolve: (root, a) => {
        if (typeof(a.row) !== "undefined") {
          return obj[sheetName][a.row];
        }
        if (Object.keys(a||{}).length > 0) {
          var k = Object.keys(a)[0];
          return obj[sheetName].find(r => {
            return r[k] == a[k];
          })
        }
      },
    }
    fieldsFromData[normalizedName + 's'] = {
      type: new GraphQLList(sheetSchemas[normalizedName]),
      description: '',
      args: connectionArgs,
      resolve: (root, args) => obj[sheetName],
    }
  });
  let ot = new GraphQLObjectType({
    name: sanitize(name),
    description: 'File ' + name,
    fields: () => fieldsFromData,
  });
  if (returnTheTypeOnly) {
    return ot;
  }
  return new GraphQLSchema({
    query: ot
  });
}

function schemaFromSpreadSheetsObj(data) {
  typenames_count = {};
  var fieldsFromData = {};
  Object.keys(data).forEach(k => {
    fieldsFromData[k] = {
      name: k,
      type: schemaFromSpreadSheet(k, data[k], true),
      resolve: () => data[k],
    }
  })
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'root',
      fields: () => fieldsFromData,
    }),
  });
}

module.exports.schemaFromSpreadSheet = schemaFromSpreadSheet;
module.exports.schemaFromSpreadSheetsObj = schemaFromSpreadSheetsObj;
