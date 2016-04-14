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

const GraphQLTypes = ["Int","String","__Schema","__Type","__TypeKind","Boolean","__Field","__InputValue","__EnumValue","__Directive"];

const initFilter = (type) => (fields, pSet, bypass) => {
  if(bypass)
    return fields;

  let refSet = _.merge.apply(_,[{}].concat(Object.keys(pSet)
  .map((roleKey) => {
    if(!pSet[roleKey][type])
      return null;
    return pSet[roleKey][type]
  }).filter(o => !!o)));
  let bounded = _.intersection(Object.keys(fields),Object.keys(refSet))
  .reduce((r,k) => {
    let bounds = _.intersection(Object.keys(fields[k].args||{}), Object.keys(refSet[k]))
    if(bounds.length > 0)
      fields[k].args = bounds.reduce((ir,ik) => {
        r[k] = fields[k].args[ik]
      },{});
    fields[k].resolve = bounder(fields[k].resolve,refSet[k]);
    r[k] = fields[k]
    return r;
  },{});
  return bounded;
}

const remapType = (schemaTypeMap, typeMap, type, newTypeList) => {
  if(type.ofType){
    const recurse = remapType(schemaTypeMap, typeMap, type.ofType, newTypeList);
    if(recurse) {
      var container = Object.create(type);
      container.ofType = recurse;
      return container;
    }
    return;
  }
  var ftk = type.name;
  if(newTypeList.indexOf(ftk) === -1)
    return;
  if(!typeMap[ftk])
    return typeMap[ftk] = Object.create(schemaTypeMap[ftk]);
  return typeMap[ftk];
};

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

const genTypeContainer = (GraphQLTypes) => {
  var types = Object.create(GraphQLTypes);
  types.Null = NullType(types);
  return types;
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
    this.GraphQLTypes = o.GraphQLTypes;
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
    let fieldCache, nulled;
    let _fields = o.fields;
    let filter = initFilter(o.name);
    o.fields = () => {
      if(fieldCache) {
        return fieldCache;
      }
      if(_fields instanceof Function)
        _fields = _fields();
      fieldCache = filter(_fields, pSet, bypass)

      if(!fieldCache || Object.keys(fieldCache).length === 0) {
        fieldCache = type.Null._config.fields;
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
    let roles,
        pSet,
        cached,
        hash,
        bypass = false;
    return this.getBypass(req)
    .then((b) =>{
      if(b)
        bypass = b;
      return this.getRoles(req);
    })
    .then((r) => {
      if(this.caching) {
        hash = this.hashRoles(r);
        if(this.schemaCache[hash])
          return cached = this.schemaCache[hash];
        roles = r;
        return this.buildPSet(roles);
      }
      roles = r;
      return this.buildPSet(roles);
    })
    .then((p) => {
      if(cached)
        return cached;
      pSet = p;
      let typeContainer = genTypeContainer(this.GraphQLTypes);
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
    this.buildSchema(req)
    .then((schema) => {
      const removeGraphQLTypes = initDiff(GraphQLTypes)
      var userTypes = removeGraphQLTypes(Object.keys(schema._typeMap));
      var permitTypes = initInclude(["Query", "User", "Post"])(Object.keys(schema._typeMap));
      var newTypeList = GraphQLTypes.concat(permitTypes);

      var s2 = Object.create(schema);

      s2._typeMap = permitTypes
      .reduce((typeMap,typeKey) => {
        var typeOverlay;
        console.log('adding: ',typeKey)
        if(typeMap[typeKey]) {
          typeOverlay = typeMap[typeKey];
        } else {
          typeOverlay = Object.create(schema._typeMap[typeKey]);
        }
        typeOverlay._fields = Object.keys(typeOverlay._fields)
        .reduce((fieldMap,fieldKey) => {
          var fieldOverlay = Object.create(typeOverlay._fields[fieldKey]);
          var ftk;
          fieldOverlay.type = remapType(schema._typeMap, typeMap, fieldOverlay.type, newTypeList);
          /*
          if(typeOverlay._fields[fieldKey].type.ofType && newTypeList.indexOf(ftk = typeOverlay._fields[fieldKey].type.ofType.name) !== -1) {
            fieldOverlay = Object.create(typeOverlay._fields[fieldKey]);
            if(!typeMap[ftk])
              typeMap[ftk] = Object.create(schema._typeMap[ftk]);
            fieldOverlay.type = Object.create(typeOverlay._fields[fieldKey].type)
            fieldOverlay.type.ofType = typeMap[ftk];
          }
          if(typeOverlay._fields[fieldKey].type.isTypeOf && newTypeList.indexOf(ftk = typeOverlay._fields[fieldKey].type.isTypeOf.name) !== -1) {
            fieldOverlay = Object.create(typeOverlay._fields[fieldKey]);
            if(!typeMap[ftk])
              typeMap[ftk] = Object.create(schema._typeMap[ftk]);
            fieldOverlay.type = typeMap[ftk];
          }
          // Base type
          if(!typeOverlay._fields[fieldKey].type.isTypeOf && !typeOverlay._fields[fieldKey].type.ofType)
            fieldOverlay = Object.create(typeOverlay._fields[fieldKey]);
            */
          if(fieldOverlay.type) {
            fieldMap[fieldKey] = fieldOverlay;
          } else {
          }
          if(fieldKey === "users"){
            console.log("TEST")
            console.log(fieldOverlay);
          }
          return fieldMap;
        },{})
        console.log(typeOverlay)
        if(Object.keys(typeOverlay._fields).length > 0) {
          typeMap[typeKey] = typeOverlay;
        }
        return typeMap;
      },GraphQLTypes.reduce((r,k) => {
        r[k] = schema._typeMap[k];
        return r;
      },{}));
      s2._queryType = s2._typeMap.Query;
      s2._mutationType = s2._typeMap.Mutation;

      return this.graphqlHTTP(() => {
        return {
          schema: s2,
          graphiql: true,
          rootValue: {req: req},
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

const initDiff = (filter) => (input) => input.filter(k => filter.indexOf(k) === -1)
const initInclude = (filter) => (input) => input.filter(k => filter.indexOf(k) !== -1)
