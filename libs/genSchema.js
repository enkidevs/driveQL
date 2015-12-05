var GraphQLObjectType = require('graphql').GraphQLObjectType;
var GraphQLSchema = require('graphql').GraphQLSchema;
var GraphQLInt = require('graphql').GraphQLInt;
var GraphQLString = require('graphql').GraphQLString;

let count = 0;

function schemaFromData() {
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'email',
      fields: {
        id: {
          type: GraphQLInt,
          resolve: (row) => row.id,
        },
        name: {
          type: GraphQLString,
          resolve: (row) => row.name,
        },
        email: {
          type: GraphQLString,
          resolve: (row) => row.email,
        }
      }
    })
  });
}


module.exports.schemaFromData = schemaFromData;
