
/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

export const min = (arg, boundary, root, args, context) => {
  if(!args[arg])
    return true;
  return args[arg] >= boundary;
};

export const max = (arg, boundary, root, args, context) => {
  if(!args[arg])
    return true;
  return args[arg] <= boundary;
};

export const oneOf = (arg, boundary, root, args, context) => {
  if(!args[arg])
    return true;
  if(!(boundary instanceof Array))
    boundary = [].concat(boundary);
  return boundary.indexOf(args[arg]) !== -1;
};
