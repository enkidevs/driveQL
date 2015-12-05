var GraphQLObjectType = require('graphql/lib/type').GraphQLObjectType;
var GraphQLSchema = require('graphql/lib/type').GraphQLSchema;
var GraphQLInt = require('graphql/lib/type').GraphQLInt;

let count = 0;

let schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      count: {
        type: GraphQLInt,
        resolve: function() {
          return count;
        }
      }
    }
  })
});

module.exports.schema = schema;
