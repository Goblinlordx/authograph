/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import {GraphQLInt, GraphQLObjectType} from 'graphql';

const NullTypeConfig = {
  name: 'Null',
  description: "Null field type placeholder",
  fields: {
    null: {
      type: GraphQLInt,
      resolve() {
        return null;
      }
    }
  }
};

const NullType = new GraphQLObjectType(NullTypeConfig);

export NullTypeConfig;
export default NullType;
