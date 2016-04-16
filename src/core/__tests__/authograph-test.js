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
  describe('filterSchema()', () => {
    it('when passed empty permissions will return undefined', () => {
      const result = filterSchema(testSchema, {});
      expect(result).to.equal(undefined);
    });
    it('when passed permissions will return schema', () => {
      const result = filterSchema(testSchema, testPermissions);
      expect(result).to.be.instanceof(GraphQLSchema);
    });
  });
});
