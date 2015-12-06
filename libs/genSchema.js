import {parseAllFiles} from '../libs/parsing';

import {
  GraphQLID,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
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

// http://stackoverflow.com/questions/9716468/is-there-any-function-like-isnumeric-in-javascript-to-validate-numbers
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function describeSimpleStats(numVals) {
  const vals = numVals.map(parseFloat);
  const min  = Math.min.apply({}, vals);
  const max  = Math.max.apply({}, vals);
  const avg  = ((vals.reduce((x, y) => x + y), 0)/vals.length).toPrecision(5);
  return '<br/><b>Min</b>: ' + min + '<br/>' +
              '<b>Max</b>: ' + max + '<br/>' +
              '<b>Avg</b>: ' + avg;
}

function describeExampleVals(stringVals) {
    return '<br/>Examples: <br/>' +
        stringVals.slice(0, 5).map(v => `"<b>${v}</b>"<br/>`).join('') +
        "...";
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

function getBasicTypeFromData(field, data) {
  const vals = data.map(x => x[field]).filter(x => !!x);
  if (!vals.length) {
    return {
      description: ' \n\n Unknown type. ' +
        'Could not infer type from data because all values ' +
        'were empty',
      type: GraphQLString,
    }
  }
  if (
    vals.every(x => x == 0 || x == 1) ||
    vals.every(x => x == true || x == false)
  ) {
    data.forEach((x, i) => {
      x[field] = (x[field] == 0) ? false : !!x[field];
      vals[i] = x[field];
    })
    return {
      description: '<br>' +
        '<b>True</b>: ' +
          Math.floor(100 * vals.reduce((x, y) => x + y, 0) / vals.length) + '%<br/>' +
        '<b>False</b>: ' +
          Math.floor(100 * vals.reduce((x, y) => x + !y, 0) / vals.length) + '%',
      type: GraphQLBoolean,
    }
  }
  if (vals.every(isNormalInteger)) {
    return {
      description: describeSimpleStats(vals),
      type: GraphQLInt,
    }
  }
  if (vals.every(isNumeric)) {
    return {
      description: describeSimpleStats(vals),
      type: GraphQLFloat,
    }
  }
  return {
    description: describeExampleVals(vals),
    type: GraphQLString,
  }
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
        var {type, description} = getBasicTypeFromData(fieldName, data);
        var relation = false;
        var normalizedName = fieldName;
        var sheetName = fieldName.slice(0, -2);
        if (fieldName.slice(fieldName.length - 2, fieldName.length) === 'Id') {
          normalizedName = sheetName;
          type = sheetSchemas[sheetName];
          description = '[more fields]',
          relation = true;
        } else if (fieldName === 'id'){
          description = describeExampleVals(data.map(x => x[fieldName])),
          type = GraphQLID;
        }
        fieldsFromData[normalizedName] = {
          type,
          description,
          resolve: (row) => {
            if (relation) {
              return getRowFromSheetById(sheetName, row[fieldName]);
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
      (sheet, id) => obj[(sheet + 's').replace(/ss$/,'s')].find(r => r.id === id));
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
      args: {
        limit:    {type: GraphQLInt},
        offset:   {type: GraphQLInt},
        sort:  {type: GraphQLString},
        sortDesc:  {type: GraphQLString},
      },
      resolve: (root, args) => {
        let data = obj[sheetName]
        if (args.sort) {
          data = data.sort((x, y) =>
            x[args.sort] >= y[args.sort] ? 1 : -1
          );
        }
        if (args.sortDesc) {
          data = data.sort((x, y) =>
            x[args.sortDesc] < y[args.sortDesc] ? 1 : -1
          );
        }
        if (args.offset) {
          data = data.slice(args.offset);
        }
        if (args.limit) {
          data = data.slice(0, args.limit);
        }
        return data;
      },
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

function removeFileExtention(path) {
  const res = path.split('_').reverse().slice(1).reverse().join('_');
  console.log('removeFileExtention',path, res)
  return res
}

function schemaFromSpreadSheetsObj(data) {
  typenames_count = {};
  var fieldsFromData = {};
  Object.keys(data).forEach(k => {
    const nk = removeFileExtention(k);
    fieldsFromData[nk] = {
      name: nk,
      type: schemaFromSpreadSheet(k, data[k], true),
      resolve: () => data[k],
    }
  });
  if (!Object.keys(data).length) {
    fieldsFromData = {
      no_data: {
        name: 'no_data',
        description: 'No API yet',
        type: GraphQLString,
        resolve: () => 'no data'
      }
    };
  }
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'root',
      fields: () => fieldsFromData,
    }),
  });
}

function genSchema() {
  const data = parseAllFiles('./.cached_files');
  global.graphQLSchema = schemaFromSpreadSheetsObj(data);
}

module.exports.schemaFromSpreadSheet = schemaFromSpreadSheet;
module.exports.schemaFromSpreadSheetsObj = schemaFromSpreadSheetsObj;
module.exports.genSchema = genSchema;
