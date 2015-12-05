import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';

import getSchemaFromFilename from '../libs/getSchemaFromFilename';

var schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      hello: {
        type: GraphQLString,
        resolve() {
          return 'world';
        }
      }
    }
  })
});

/**
 * GET /
 * Home page.
 */
export function index(req, res) {
  let {
    file,
    query
  } = req.query;
  let data = getSchemaFromFilename(file);
  data.then((d) => {
    console.log(d);
  })
  graphql(schema, query).then(result => {
    res.send(result);
  });
};
