import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';

import {parseFile} from '../libs/parsing';
import {schemaFromSpreadSheet} from '../libs/genSchema';

const FILE = './fixtures/TestTables.ods';
const data = parseFile(FILE);
const schema = schemaFromSpreadSheet("test", data);

/**
 * GET /
 * Home page.
 */
export function index(req, res) {
  let { query } = req.query;
  graphql(schema, query).then(result => {
    res.send(result);
  });
};
