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

function schemaFromArrayOfObjects(name, data) {
  var firstRow = data[0];
  var fieldsFromData = {};
  // inferring types (Int or String) from first row
  Object.keys(firstRow).forEach(fieldName => {
    var val = firstRow[fieldName];
    fieldsFromData[fieldName] = {
      type: isNormalInteger(val) ? GraphQLInt : GraphQLString,
      description: 'Example value: ' + val,
      resolve: (row) => {
        console.log('resolving ', row, fieldName);
        return row[fieldName];
      }
    }
  });
  return new GraphQLObjectType({
    name: sanitize(name),
    fields: () => {
      return fieldsFromData;
    },
  });
}

function schemaFromSpreadSheet(name, obj, returnTheTypeOnly) {
  var fieldsFromData = {};
  var connectionToFields = {};
  Object.keys(obj).forEach(sheetName => {
    var sheetSchema = schemaFromArrayOfObjects(sheetName, obj[sheetName]);
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
    fieldsFromData[sheetName.replace(/s$/,'')] = {
      type: sheetSchema,
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
    fieldsFromData[sheetName.replace(/s$/,'') + 's'] = {
      type: new GraphQLList(sheetSchema),
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
