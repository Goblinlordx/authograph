/**
 *  Copyright (c) 2016, Ben Baldivia
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import Authograph from '../index';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Index', () => {
  it('exports Authograph', () => {
    expect(Authograph).to.not.equal(undefined);
  });
});
