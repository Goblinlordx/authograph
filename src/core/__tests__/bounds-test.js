/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import {
  min,
  max,
  oneOf
} from '../bounds';

import {describe, it} from 'mocha';
import {expect} from 'chai';


describe('Bounding function tests:', () => {
  describe('min',() => {
    it('passes when argument is not received', () => {
      expect(min('testArg', 2, null, {})).to.equal(true);
    });
    it('passes when argument equal to min', () => {
      expect(min('testArg', 2, null, {testArg: 2})).to.equal(true);
    });
    it('passes when argument greater than min', () => {
      expect(min('testArg', 2, null, {testArg: 3})).to.equal(true);
    });
    it('fails when argument less than min', () => {
      expect(min('testArg', 2, null, {testArg: 1})).to.equal(false);
    });
  });
  describe('max', () => {
    it('passes when argument is not received', () => {
      expect(max('testArg', 2, null, {})).to.equal(true);
    });
    it('passes when argument equal to max', () => {
      expect(max('testArg', 2, null, {testArg: 2})).to.equal(true);
    });
    it('fails when argument greater than max', () => {
      expect(max('testArg', 2, null, {testArg: 3})).to.equal(false);
    });
    it('passes when argument less than max', () => {
      expect(max('testArg', 2, null, {testArg: 1})).to.equal(true);
    });
  });
  describe('oneOf', () => {
    it('passes when argument is not received', () => {
      expect(oneOf('testArg', 2, null, {})).to.equal(true);
    });
    it('passes when argument value is in set', () => {
      expect(oneOf('testArg', [ 'test', 'asdf' ],
                   null, {testArg: 'asdf'})).to.equal(true);
    });
    it('passes when argument value is single value and not array', () => {
      expect(oneOf('testArg', 'asdf',
                   null, {testArg: 'asdf'})).to.equal(true);
    });
    it('fails when argument is not in set', () => {
      expect(oneOf('testArg', [ 'test', 'asdf' ],
                   null, {testArg: 'fail'})).to.equal(false);
    });
  });
});
