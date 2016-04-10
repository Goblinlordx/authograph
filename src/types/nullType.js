/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

 const NullType = (type) => {
   var def = new type.GraphQLObjectType({
     name: 'Null',
     description: "Null field type placeholder",
     fields: {
       null: {
         type: type.GraphQLInt,
         resolve() {
           return null;
         }
       }
     }
   });
   return type[def.name] = def;
 };

export default NullType;
