import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';

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
  let { query } = req.query;
  graphql(schema, query).then(result => {
    res.send(result);
  });
};
