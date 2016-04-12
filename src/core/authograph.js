/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */
import _ from 'lodash';
import bounder from './bounder';
import * as Bounds from './bounds';
import generateTypeContainer from './generateTypeContainer';
import NullType from '../types/nullType'

const initFilter = (type) => (fields, pSet, bypass) => {
  if(bypass)
    return fields;

  // Combine multiple roles into a single tree
  let refSet = _.assign.apply(null,[{}].concat(Object.keys(pSet)
  .map((roleKey) => {
    if(!pSet[roleKey][type])
      return null;
    return pSet[roleKey][type];
  }).filter(o => !!o)));

  // Intersection of fields and args on real schema with permission set with role based bounds attached
  return _.intersection(Object.keys(fields),Object.keys(refSet))
  .reduce((r,k) => {
    let bounds = _.intersection(Object.keys(fields[k].args||{}), Object.keys(refSet[k]));
    if(bounds.length > 0) {
      fields[k].args = bounds.reduce((ir,ik) => {
        ir[ik] = fields[k].args[ik];
        return ir;
      },{});
    }
    fields[k].resolve = bounder(fields[k].resolve,refSet[k]);
    r[k] = fields[k];
    return r;
  },{});
}

export default class Authograph {
  constructor(o = {}){
    if(o.getRoles instanceof Function)
      this.getRoles = o.getRoles;
    if(o.buildPSet instanceof Function)
      this.buildPSet = o.buildPSet;
    if(o.getBypass instanceof Function)
      this.getBypass = o.getBypass;
    if(o.httpErrorHandler instanceof Function)
      this.httpErrorHandler = o.httpErrorHandler;
    if(o.hashRoles instanceof Function)
      this.hashRoles = o.hashRoles;
    if(o.cacheVersion instanceof Function)
      this.cacheVersion = o.cacheVersion;
    this.Bounds = _.assign(Bounds, o.Bounds);
    this.GraphQLTypes = o.GraphQLTypes;
    this.graphqlHTTP = o.graphqlHTTP;
    this.bypass = o.bypass||false;
    this.caching = o.caching||false;
    this.handlerOps = o.handlerOps||{};
    this.Query = o.Query;
    this.Mutation = o.Mutation;
    this.types = o.types||[];
    this.graphqlHTTP = o.graphqlHTTP;
    this.schemaCache = {};
  }
  cacheVersion() {
    return Promise.resolve(this._currentCacheVersion);
  }
  setCacheVersion(v) {
    this._currentCacheVersion = v;
    return Promise.resolve(v)
  }
  validateCache() {
    this.cacheVersion()
    .then((v) => {
      if(v !== this.cacheVersion)
        return false;
      return true;
    })
  }
  flushCache(){
    schemaCache = {};
    return Promise.resolve(true);
  }
  getBypass(){
    return Promise.resolve(this.bypass);
  }
  getRoles(){
    return Promise.resolve([]);
  }
  buildPSet(){
    return Promise.resolve({});
  }
  hashRoles(roles){
    return roles.sort().join();
  }
  httpErrorHandler(req,res) {
    return (err) => {
      console.error("Error caught:");
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  }
  applyPermissions(type, o,pSet = {}, bypass) {
    let fieldCache;
    let _fields = o.fields;
    let filter = initFilter(o.name);
    o.fields = () => {
      if(fieldCache) {
        return fieldCache;
      }
      if(_fields instanceof Function)
        _fields = _fields();
      fieldCache = filter(_fields, pSet, bypass);

      if(!fieldCache || Object.keys(fieldCache).length === 0) {
        fieldCache = type.Null._typeConfig.fields;
      }
      return fieldCache;
    }
    return o;
  }
  genType(typeContainer, TypeDef, pSet, bypass) {
    let def;
    try{
      def = this.applyPermissions(typeContainer, TypeDef(typeContainer), pSet, bypass);
    }
    catch(err) {
      dev = NullType;
    }
    return typeContainer[def.name] = new typeContainer.GraphQLObjectType(def);
  }
  buildSchema(req) {
    let pSet,
        cached,
        hash,
        bypass = false;
    return this.getBypass(req)
    .then((b) =>{
      if(this.verbose)
        console.log(`Bypassing Authorization: ${b}`)
      if(b)
        bypass = b;
      return this.getRoles(req);
    })
    .then((r) => {
      req.Roles = r;
      if(this.caching) {
        hash = this.hashRoles(req.Roles);
        if(this.schemaCache[hash])
          return cached = this.schemaCache[hash];
        return this.buildPSet(req.Roles);
      }
      return this.buildPSet(req.Roles);
    })
    .then((p) => {
      if(cached)
        return cached;
      pSet = p;
      let typeContainer = generateTypeContainer(this.GraphQLTypes);
      // Generate types
      this.types.forEach(t => this.genType(typeContainer, t, pSet, bypass));
      return typeContainer;
    })
    .then((typeContainer) => {
      if(cached)
        return cached;
      let schema = {
        query: this.genType(typeContainer, this.Query, pSet, bypass),
        mutation: this.genType(typeContainer,this.Mutation,pSet,bypass)
      }

      if(this.caching)
        return this.schemaCache[hash] = new typeContainer.GraphQLSchema(schema);
      return new typeContainer.GraphQLSchema(schema);
    })
  }

  agHTTP(req,res) {
    return this.buildSchema(req)
    .then((schema) => {
      return this.graphqlHTTP(() => {
        return {
          schema: schema,
          graphiql: true,
          rootValue: {req:req},
          formatError(err) {
            console.log(`Format validation error: ${err}`);
            return err;
          }
        }
      })(req,res)
    })
    .catch(this.httpErrorHandler(req,res));
  }
}
