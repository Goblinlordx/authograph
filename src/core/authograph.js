/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */
import _ from 'lodash';
import * as Bounds from './bounds';

const GraphQLTypes = [
  'Int',
  'String',
  '__Schema',
  '__Type',
  '__TypeKind',
  'Boolean',
  '__Field',
  '__InputValue',
  '__EnumValue',
  '__Directive'
];


/**
*  remapFieldType recurses through wrapped object types to find the base
*  Object Type.  If the type is not in a whitelist of types (newTypeList),
*  The Type is returned undefined.  If it is in the whitelist a new type
*  which has the prototype of the old type is returned.
*  @param {Object} schemaTypeMap - schema._typeMap from a base GraphQL schema
*  @param {Object} typeMap - the typeMap which will be used in new schema
*  @param {Object} type - Type which is being checked
*  @param {Array} newTypeList - List of Type.name which are whitelisted in
*                               new schema
*/
const remapFieldType = (schemaTypeMap, typeMap, type, newTypeList) => {
  if (type.ofType) {
    const recurse = remapFieldType(schemaTypeMap,
                                   typeMap, type.ofType, newTypeList);
    if (recurse) {
      const container = Object.create(type);
      container.ofType = recurse;
      return container;
    }
    return;
  }
  const ftk = type.name;
  if (newTypeList.indexOf(ftk) === -1) {
    return;
  }
  if (!typeMap[ftk]) {
    typeMap[ftk] = Object.create(schemaTypeMap[ftk]);
  }
  return typeMap[ftk];
};

/**
*  bounder function wraps a resolver with a function which validates bounding
*  functions.
*  @param {Function} resolve - GraphQL field resolve function
*  @param {Object} bounds - Object containing bounds
*  @param {Object} BoundingDefs - Object containing bounding
*                                 function definitions
*  @return {Function} resolver - Returns a GraphQL field resolve function
*/
const bounder = (resolve, bounds, BoundingDefs) => {
  return (root, args, context) => {
    const permittedRoles = context.schema._permittedRoles || [];
    const oob = context.schema._oob;

    Object.keys(bounds)
    .forEach(arg => {
      return Object.keys(bounds[arg])
      .forEach(role => {
        if (permittedRoles.indexOf(role) === -1) {
          return;
        }
        const pass = Object.keys(bounds[arg][role])
        .every(bound => {
          if (!BoundingDefs[bound]) {
            console.warn(new Error(`Invalid permission bounder ${bound}`));
            return true;
          }
          return BoundingDefs[bound](arg,
            bounds[arg][role][bound], root, args, context);
        });
        if (!pass) {
          console.log(context);
          permittedRoles.splice(permittedRoles.indexOf(role),1);
          oob.push([
            context.parentType.name,
            context.fieldName,
            bounds,
            args
          ]);
        }
      });
    });
    if (permittedRoles.length === 0) {
      throw new Error(`Parameters exceeded bounds: ${JSON.stringify(oob)}}`);
    }
    return resolve(root, args, context);
  };
};

/**
*  filterSchema takes as parameters a base GraphQL schema, permissions object,
*  and a list of permitted roles that can use the resultant schema.  The return
*  is the resultant schema which has been sanitized and has bounding functions
*  injected into the field resolver functions.
*  @param {GraphQLSchema} schema - Base GraphQL schema
*  @param {PSet} pSet - Permissions set object
*  @param {Object} BoundingDefs - Object containing bounding
*                                 function definitions
*  @param {Array} permittedRoles - Roles which are permitted to use resultant
*                                  schema. (Optional)
*  @return {GraphQLSchema} - Sanitized resultant schema
*/
export const filterSchema = (schema, pSet, BoundingDefs, permittedRoles) => {
  let deriveP;
  let pRoles;
  if (permittedRoles) {
    pRoles = permittedRoles.slice(0, permittedRoles.length);
  } else {
    deriveP = true;
    pRoles = [];
  }
  const permitTypes = _.intersection(Object.keys(pSet),
                                   Object.keys(schema._typeMap));
  const newTypeList = GraphQLTypes.concat(permitTypes);
  const filteredSchema = Object.create(schema);

  filteredSchema._typeMap = permitTypes
  .reduce((typeMap, typeKey) => {
    let typeOverlay;
    if (typeMap[typeKey]) {
      typeOverlay = typeMap[typeKey];
    } else {
      typeOverlay = Object.create(schema._typeMap[typeKey]);
    }

    typeOverlay._fields = _.intersection(Object.keys(pSet[typeKey]),
                                         Object.keys(typeOverlay._fields))
    .reduce((fieldMap,fieldKey) => {
      const fieldOverlay = Object.create(typeOverlay._fields[fieldKey]);
      fieldOverlay.type = remapFieldType(schema._typeMap, typeMap,
                                         fieldOverlay.type, newTypeList);
      if (fieldOverlay.type) {
        fieldOverlay.args = fieldOverlay.args
        .filter(arg => Object.keys(pSet[typeKey][fieldKey])
                       .indexOf(arg.name) !== -1 || arg.name === '_');

        fieldOverlay.resolve = bounder(fieldOverlay.resolve,
                                            pSet[typeKey][fieldKey],
                                            BoundingDefs);
        if (deriveP) {
          Object.keys(pSet[typeKey][fieldKey]).forEach(arg => {
            Object.keys(pSet[typeKey][fieldKey][arg]).forEach(role => {
              if (pRoles.indexOf(role) === -1) {
                pRoles.push(role);
              }
            });
          });
        }
        fieldMap[fieldKey] = fieldOverlay;
      }
      return fieldMap;
    },{});
    typeMap[typeKey] = typeOverlay;
    return typeMap;
  }, GraphQLTypes
  .reduce((r,k) => {
    r[k] = schema._typeMap[k];
    return r;
  },{}));

  if (!filteredSchema._typeMap[filteredSchema._queryType.name]) {
    return; // Invalid schema
  }
  filteredSchema._queryType = filteredSchema
    ._typeMap[filteredSchema._queryType.name];

  if (filteredSchema._mutationType &&
      filteredSchema._typeMap[filteredSchema._mutationType.name]) {

    filteredSchema._mutationType = filteredSchema
      ._typeMap[filteredSchema._mutationType.name];

  } else {
    // Prevent property lookup of old mutation type
    filteredSchema._mutationType = undefined;
  }
  filteredSchema._permittedRoles = pRoles;
  return filteredSchema;
};

export class Authograph {
  constructor(o = {}) {
    if (o.getRoles instanceof Function) {
      this.getRoles = o.getRoles;
    }
    if (o.buildPSet instanceof Function) {
      this.buildPSet = o.buildPSet;
    }
    if (o.hashRoles instanceof Function) {
      this.hashRoles = o.hashRoles;
    }
    if (o.emptySchemaHandler instanceof Function) {
      this.emptySchemaHandler = o.emptySchemaHandler;
    }
    if (o.cacheVersion instanceof Function) {
      this.cacheVersion = o.cacheVersion;
    }
    this.Bounds = _.assign({},Bounds, o.Bounds);
    this.caching = o.caching || false;
    this.schemaCache = {};
  }

  cacheVersion() {
    return Promise.resolve(this._currentCacheVersion);
  }

  setCacheVersion(v) {
    this._currentCacheVersion = v;
    return Promise.resolve(v);
  }

  validateCache() {
    this.cacheVersion()
    .then(v => {
      if (v !== this.cacheVersion) {
        return false;
      }
      return true;
    });
  }

  flushCache() {
    this.schemaCache = {};
    return Promise.resolve(true);
  }

  getRoles() {
    return Promise.resolve([]);
  }

  buildPSet() {
    return Promise.resolve({});
  }

  hashRoles(roles) {
    return roles.sort().join();
  }

  httpErrorHandler(req, res, err) {
    res.status(500).send('Internal Server Error');
    throw err;
  }

  middleware(baseSchema) {
    return (req, res, next) => {
      try {
        let roles;
        return this.getRoles(req)
        .then(r => {
          roles = r;
          return this.buildPSet(roles);
        })
        .then(pSet => {
          return filterSchema(baseSchema, pSet, this.Bounds, roles);
        })
        .then(schema => {
          if (schema) {
            req.schema = Object.create(schema);
            req.schema._oob = [];
          } else {
            console.log('Insufficient permissions to use schema');
            if (this.emptySchemaHandler) {
              return this.emptySchemaHandler(req,res);
            }
            return res.status(404).send('Not found');
          }
          next();
        });
      } catch (err) {
        return this.httpErrorHandler(req, res, err);
      }
    };
  }
}
