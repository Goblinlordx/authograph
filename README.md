Authograph
==========
##### Authorization solution for use with GraphQL.
[![npm version](https://badge.fury.io/js/authograph.svg)](https://badge.fury.io/js/authograph) [![Build Status](https://travis-ci.org/Goblinlordx/authograph.svg?branch=master)](https://travis-ci.org/Goblinlordx/authograph) [![Coverage Status](https://coveralls.io/repos/github/Goblinlordx/authograph/badge.svg?branch=master)](https://coveralls.io/github/Goblinlordx/authograph?branch=master)

Authograph is intended to be a solution specifically for handling Authorization.  Authograph is an implementation of [Role Based Access Control](https://en.wikipedia.org/wiki/Role-based_access_control).  On any given server Access Control can broken down into 2 phases prior passing an event to some handler function.

![alt text](https://raw.githubusercontent.com/Goblinlordx/authograph/master/resources/a_a_h.png "Authentication -> Authorization -> Request Handler (REST, GraphQL, etc.)")



Authentication should occur first.  This is the act of identifying a specific user.  This can be done in many ways.  You might use Passport.js middleware to accomplish this task.  You could also use the phase of the moon if you really wanted as Authograph has no requirement as far as how you accomplish this.

Authorization is done via Authograph and is Authographs core functionality.  Currently, Authograph is being developed for use specifically with GraphQL schemas.  Authograph will whitelist a schema based on a permission set as well as wrap resolving functions with bounding functions to bound client sent arguments based on role.

Lastly, after Authograph has processed the base schema the resultant schema can then be used by a GraphQL handler (graphql, express-graphql, etc).


## Getting Started

Install for use in your project

```sh
npm i -S authograph
```

#### Usage
There are 2 main ways to use this package.  You can either use a configured instance as middleware or you can use the standalone filterSchema function.

##### Using as middleware
The ```.middleware(schema)``` method on a configured instance as middleware.  This will attach a ```.schema``` property to the ```req``` object.
```
getRoles: <Function returning a promise of roles>
builtPSet: <Function which takes a set of roles resolved from getRoles and returns a promise which resolves to a structure containing permissions>
```

```js
import Authograph from 'authograph';

const instance = new Authograph({
  getRoles(req) {
    console.log("getRoles called");
    var user = req.user||{};
    if(!(user.Roles instanceof Array))
      return Promise.resolve([]);
    return Promise.resolve(user.Roles.map(o => o.type));
  },
  buildPSet(roleIds) {
    Promise.resolve({
      Query: {
        users: {
          id: {
            admin:{
              min: 1,
              max: 6
            }
          },
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
<GraphQL Object Type name>: {
  <field name>: {
    <field arg>: {
      <role identifier>: {
        <bounds>: <bounds parameter>  // Optional
      }
    }
  }
}
```

##### Using filterSchema
The ```filterSchema``` function is provided if you would like to manage the request to permissions mapping.  This function can be used to simply take a base schema, a permissions object, and a bounding function definition object. ```filterSchema``` will output a sanitized schema which can then be used by GraphQL.

```js
import {filterSchema} from 'authograph';
import {graphql} from 'graphql';
import mySchema from './mySchema';
import myBounds from './myBounds';

.
.
.

const processQuery = async (query, permissionsObj) => {
  const restrictedSchema = filterSchema(mySchema, permissionsObj, myBounds);
  return await graphql(restrictedSchema, query);
};
```
