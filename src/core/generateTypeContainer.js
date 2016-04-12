/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */
import NullType from '../types/nullType';

const generateTypeContainer = (GraphQLTypes) => {
  let types = Object.create(GraphQLTypes);
  types.Null = NullType(types);
  return types;
}

export default generateTypeContainer;