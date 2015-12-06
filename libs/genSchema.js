import {parseAllFiles} from '../libs/parsing';

import {
  GraphQLID,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';

// http://stackoverflow.com/questions/10834796/validate-that-a-string-is-a-positive-integer
function isNormalInteger(str) {
  const n = ~~Number(str);
  return String(n) === str && n >= 0;
}

// http://stackoverflow.com/questions/9716468/is-there-any-function-like-isnumeric-in-javascript-to-validate-numbers
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function describeSimpleStats(numVals) {
  const vals = numVals.map(parseFloat);
  const min = Math.min.apply({}, vals);
  const max = Math.max.apply({}, vals);
  const avg = ((vals.reduce((x, y) => x + y), 0) / vals.length).toPrecision(5);
  return '<br/><b>Min</b>: ' + min + '<br/>' +
              '<b>Max</b>: ' + max + '<br/>' +
              '<b>Avg</b>: ' + avg;
}

function describeExampleVals(stringVals) {
  return '<br/>Examples: <br/>' +
      stringVals.slice(0, 5).map(v => `"<b>${v}</b>"<br/>`).join('') +
      '...';
}

let typenamesCount = {};

function sanitize(name) {
  let clean = name.replace(/[^_a-zA-Z0-9]/g, '_');
  if (typenamesCount[clean]) {
    typenamesCount[clean] = typenamesCount[clean] + 1;
    clean = clean + '_' + (typenamesCount[clean] - 1);
  } else {
    typenamesCount[clean] = 1;
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
    };
  }
  if (
    vals.every(x => x == 0 || x == 1) ||
    vals.every(x => x == true || x == false)
  ) {
    data.forEach((x, i) => {
      x[field] = (x[field] == 0) ? false : !!x[field];
      vals[i] = x[field];
    });
    return {
      description: '<br>' +
        '<b>True</b>: ' +
          Math.floor(100 * vals.reduce((x, y) => x + y, 0) / vals.length) + '%<br/>' +
        '<b>False</b>: ' +
          Math.floor(100 * vals.reduce((x, y) => x + !y, 0) / vals.length) + '%',
      type: GraphQLBoolean,
    };
  }
  if (vals.every(isNormalInteger)) {
    return {
      description: describeSimpleStats(vals),
      type: GraphQLInt,
    };
  }
  if (vals.every(isNumeric)) {
    return {
      description: describeSimpleStats(vals),
      type: GraphQLFloat,
    };
  }
  return {
    description: describeExampleVals(vals),
    type: GraphQLString,
  };
}

function typeFromArrayOfObjects(name, data, sheetSchemas, getRowFromSheetById) {
  return new GraphQLObjectType({
    name: sanitize(name),
    fields: () => {
      const firstRow = data[0];
      const fieldsFromData = {};
      // inferring types (Int or String) from first row
      Object.keys(firstRow).forEach(fieldName => {
        let {type, description} = getBasicTypeFromData(fieldName, data);
        let relation = false;
        let normalizedName = fieldName;
        const sheetName = fieldName.slice(0, -2);
        if (fieldName.slice(fieldName.length - 2, fieldName.length) === 'Id') {
          normalizedName = sheetName;
          type = sheetSchemas[sheetName];
          description = '[more fields]';
          relation = true;
        } else if (fieldName === 'id') {
          description = describeExampleVals(data.map(x => x[fieldName]));
          type = GraphQLID;
        }
        fieldsFromData[normalizedName] = {
          name: normalizedName,
          type,
          description,
          resolve: (row) => {
            if (relation) {
              return getRowFromSheetById(sheetName, row[fieldName]);
            }
            return row[fieldName];
          },
        };
      });
      return fieldsFromData;
    },
  });
}

function schemaFromSpreadSheet(name, obj, returnTheTypeOnly) {
  const sheetSchemas = {};
  const fieldsFromData = {};
  Object.keys(obj).reverse().forEach(sheetName => {
    const normalizedName = sanitize(sheetName.replace(/s$/, ''));
    sheetSchemas[normalizedName] = typeFromArrayOfObjects(normalizedName, obj[sheetName], sheetSchemas,
      (sheet, id) => obj[(sheet + 's').replace(/ss$/, 's')].find(r => r.id === id));
    const args = {
      row: {
        type: GraphQLInt,
      },
    };
    const firstRow = obj[sheetName][0];
    const keys = Object.keys(firstRow);
    keys.forEach(key => {
      const val = firstRow[key];
      args[key] = {
        type: isNormalInteger(val) ? GraphQLInt : GraphQLString,
      };
    });
    fieldsFromData[normalizedName] = {
      name: normalizedName,
      type: sheetSchemas[normalizedName],
      description: 'Sheet ' + sheetName,
      args,
      resolve: (root, a) => {
        if (typeof(a.row) !== 'undefined') {
          return obj[sheetName][a.row];
        }
        if (Object.keys(a || {}).length > 0) {
          const k = Object.keys(a)[0];
          return obj[sheetName].find(r => {
            return r[k] == a[k];
          });
        }
        return obj[sheetName][0];
      },
    };
    fieldsFromData[normalizedName + 's'] = {
      type: new GraphQLList(sheetSchemas[normalizedName]),
      description: 'Sheet (list) ' + sheetName,
      args: {
        limit: {type: GraphQLInt},
        offset: {type: GraphQLInt},
        sort: {type: GraphQLString},
        sortDesc: {type: GraphQLString},
      },
      resolve: (root, args) => {
        let data = obj[sheetName];
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
    };
  });
  const ot = new GraphQLObjectType({
    name: sanitize(name),
    description: 'File ' + name,
    fields: () => fieldsFromData,
  });
  if (returnTheTypeOnly) {
    return ot;
  }
  return new GraphQLSchema({
    query: ot,
  });
}

function removeFileExtention(path) {
  return path.split('_').reverse().slice(1).reverse().join('_');
}

function schemaFromSpreadSheetsObj(data) {
  typenamesCount = {};
  let fieldsFromData = {};
  Object.keys(data).forEach(k => {
    const nk = removeFileExtention(k);
    let schema;
    try {
      schema = {
        name: nk,
        type: schemaFromSpreadSheet(k, data[k], true),
        resolve: () => data[k],
      };
    } catch (e) {
      console.log(e);
      schema = {
        name: nk,
        description: 'Broken data',
        type: GraphQLString,
        resolve: () => 'broken data',
      };
    }
    fieldsFromData[nk] = schema;
  });
  if (!Object.keys(data).length) {
    fieldsFromData = {
      no_data: {
        name: 'no_data',
        description: 'No API yet',
        type: GraphQLString,
        resolve: () => 'no data',
      },
    };
  }
  try {
    return new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'root',
        fields: () => fieldsFromData,
      }),
    });
  } catch (e) {
    console.log(e);
    return new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'root',
        fields: () => {
          return {
            'BrokenData': {
              name: 'BrokenData',
              description: 'Broken data',
              type: GraphQLString,
              resolve: () => 'broken data',
            },
          };
        },
      }),
    });
  }
}

function genSchema() {
  const data = parseAllFiles('./.cached_files');
  global.graphQLSchema = schemaFromSpreadSheetsObj(data);
}

module.exports.schemaFromSpreadSheet = schemaFromSpreadSheet;
module.exports.schemaFromSpreadSheetsObj = schemaFromSpreadSheetsObj;
module.exports.genSchema = genSchema;
