/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

export const min = (arg, bound) => (root, args, context) => {
  if(!args[arg])
    return true;
  return arg[arg] > bound;
};

export const max = (arg, bound) => (root, args, context) => {
  if(!args[arg])
    return true;
  return arg[arg] < bound;
}

export const oneOf = (arg, bound) => (root, args, context) => {
  if(!args[arg])
    return true;
  if(!(bound instanceof Array))
    return args[arg] === bound;
  return bound.indexOf(args[arg]) !== -1;
}

export const or = () => Array.slice.call(arguments).some(r=>!!r);
export const and = () => Array.slice.call(arguments).every(r=>!!r);
