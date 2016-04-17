/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt
} from 'graphql';

export const testPermissions = {
  Query: {
    id: {
      _: {
        admin: {}
      }
    },
    list: {
      _: {
        admin: {}
      }
    }
  }
};

export const Query = new GraphQLObjectType({
  name: 'Query',
  desciption: 'Test Query Type;',
  fields() {
    return {
      id: {
        type: GraphQLInt,
        resolve() {
          return 1;
        }
      },
      name: {
        type: GraphQLString,
        resolve() {
          return 'Test Usera Name';
        }
      },
      list: {
        type: new GraphQLList(GraphQLString),
        resolve() {
          return [ 'List item 1', 'List item 2' ];
        }
      }
    };
  }
});

export const testSchema = new GraphQLSchema({
  query: Query
});
