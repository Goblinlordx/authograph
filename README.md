Authograph
==========

Authorization solution for use with GraphQL.


## Getting Started

Install for use in your project

```sh
npm i -S authograph
```

#### Usage
An instance of Authograph has a method ```.agHTTP``` can be used as a HANDLE function (```function(req,res)```).  This can be used with express in the following way:
```js
import authograph from './graphql/authograph';

.
.
.


app.use('/graphql', authograph.agHTTP.bind(authograph));
```


###### Type definitions
Type definitions must be refactored slightly to work with this package.  Type definitions are injected at execution type to provide restricted types based on a permission set.  Below is a standard GraphQL object type definition (partially taken from [SWAPI implentation](https://github.com/graphql/swapi-graphql/blob/master/src/schema/types/species.js)):
```js
import {
  GraphQLObjectType,
  GraphQLString
} from 'graphql';

var SpeciesType = new GraphQLObjectType({
  name: 'Species',
  description: `A type of person or character within the Star Wars Universe.`,
  fields: () => ({
    name: {
      type: GraphQLString,
      description: `The name of this species.`
    }
});

export default SpeciesType;
```

To refactor this to be compatible first remove the GraphQLObjectType instantiation and instead define a function taking the single parameter ```type```.

```js
var SpeciesType = (type) => {
}
```
Next in the each field's ```type``` field should be set to ```type.<typename>```

```js
type: type.GraphQLString,
```

The result of this refactoring should look like this:
```js
var SpeciesType = (type) => {
  name: 'Species',
  description: `A type of person or character within the Star Wars Universe.`,
  fields: () => ({
    name: {
      type: type.GraphQLString,
      description: `The name of this species.`
    }
};

export default SpeciesType;
```

##### Creating a usable instance
Inside your project first configure an instance for your server to use.  This requires a few things to be injected into the configuration.
```
Query: <Root Query GraphQL Object Type>
Mutation: <Root Mutation GraphQL Object Type>
GraphQLTypes: <GraphQL Object Types>
graphqlHTTP: <graphQLHTTP implementation from graphql-express>
types: <Your custom GraphQL Type definitions>
getRoles: <Function returning a promise of roles>
builtPSet: <Function which takes a set of roles resolved from getRoles and returns a promise which resolves to a structure containing permissions>
```

```js
import MyRootQuery from './Query';
import MyRootMutation from './Mutation';
import * as GraphQLTypes from 'graphql/types';

const instance = new Authograph({
  Query: MyRootQuery,
  Mutation: MyRootMutation,
  GraphQLTypes: GraphQLTypes,
  graphqlHTTP: graphqlHTTP,
  types: Types,
  getRoles(req) {
    console.log("getRoles called");
    var user = req.user||{};
    if(!(user.Roles instanceof Array))
      return Promise.resolve([]);
    return Promise.resolve(user.Roles.map(o => o.id));
  },
  buildPSet(roleIds) {
    Promise.resolve({
      admin: {
        users: {
          name: {
            admin:{}
          },
          email: {
            admin:{}
          }
        }
      }
    });
  }
});
export default instance;
```

##### getRoles()
```getRoles``` must return a promise.  The promise itself can resolve to any type which is serializable.  The serialization of the roles will be used for keeping a hash to map to a previously resolved schema definition with permissions applied.  In general, it can be any set of things as the hashing function can also be overwritten in the config.

##### buildPSet()
```buildPSet``` must return a promise.  The promise should resolve to a Object with the following format.
```js
<Role identifier>: {
  <GraphQL Object Type name>: {
    <field name>: {
      <role>: {}, // Used if are no bounds are used applied to input args for a role type
      <field arg>: {<bounds>}
    }
  }
}
```
