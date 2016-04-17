/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import {
  filterSchema,
  Authograph
} from '../authograph';

import {
  testSchema,
  testPermissions
} from './testSchema-test.js';

import {
  GraphQLSchema
} from 'graphql';

import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Authograph', () => {
  it('exports Authograph', () => {
    expect(Authograph).to.not.equal(undefined);
  });
  it('exports filterSchema()', () => {
    expect(filterSchema).to.not.equal(undefined);
  });
  it('is extendable', () => {
    const authObj = new Authograph();
    expect(authObj).to.be.instanceof(Authograph);
  });
  describe('.getRoles()', () => {
    it('Returns an Promise resolving empty Array by default', async () => {
      const authObj = new Authograph();
      const result = authObj.getRoles();
      expect(result).to.be.instanceof(Promise);
      const pResult = await result;
      expect(pResult).to.be.instanceof(Array);
      expect(pResult.length).to.be.equal(0);
    });
  });
  describe('.buildPSet()', () => {
    it('Returns an Promise resolving empty Object by default', async () => {
      const authObj = new Authograph();
      const result = authObj.buildPSet();
      expect(result).to.be.instanceof(Promise);
      const pResult = await result;
      expect(pResult).to.be.instanceof(Object);
      expect(Object.keys(pResult).length).to.be.equal(0);
    });
  });
});
describe('filterSchema()', () => {
  it('when passed empty permissions will return undefined', () => {
    const result = filterSchema(testSchema, {});
    expect(result).to.equal(undefined);
  });
  it('when passed permissions will return schema', () => {
    const result = filterSchema(testSchema, testPermissions);
    expect(result).to.be.instanceof(GraphQLSchema);
  });
  it('when passed permissions properly filters unauthorized fields', () => {
    const result = filterSchema(testSchema, testPermissions);
    expect(result._typeMap.Query._fields.name).to.equal(undefined);
  });
});
