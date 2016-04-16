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

export default class Authograph {
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
  getBypass() {
    return Promise.resolve(this.bypass);
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
  httpErrorHandler(req,res) {
    return err => {
      res.status(500).send('Internal Server Error');
      throw err;
    };
  }

  bounder(resolve, bounds) {
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
            if (!this.Bounds[bound]) {
              console.warn(new Error(`Invalid permission bounder ${bound}`));
              return true;
            }
            return this.Bounds[bound](arg,
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
  }

  filterSchema(schema, pSet) {
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

          fieldOverlay.resolve = this.bounder(fieldOverlay.resolve,
                                              pSet[typeKey][fieldKey]);
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

    return filteredSchema;
  }
  middleware(baseSchema) {
    return (req, res, next) => {
      let roles;
      return this.getRoles(req)
      .then(r => {
        roles = r;
        return this.buildPSet(roles);
      })
      .then(pSet => {
        return this.filterSchema(baseSchema, pSet);
      })
      .then(schema => {
        if (schema) {
          req.schema = Object.create(schema);
          req.schema._permittedRoles = roles;
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
    };
  }

}
