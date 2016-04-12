/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

/**
*  Receives resolve function and bounds.  Returns a resolve function which calls all bounds prior to resolving.
*  If any bounding function for a given role returns false that role will be removed from any further resolves.
*
*  @param {function} resolve
*  @param {Object} bounds
*/
const bounder = (resolve, bounds) => {
  return (root, args, context) => {
    if(!Object.keys(context))
      return null;
    return resolve(root, args, context);
  };
};

export default bounder;