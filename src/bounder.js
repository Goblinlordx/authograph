/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

const bounder = (resolve, bounds) => (root, args, context) => {
  console.log(bounds);
  return resolve(root, args, context);
}

export default bounder;
