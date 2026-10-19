const { describe, it } = require('mocha');
const { expect } = require('chai');
const { slugify } = require('../src/slugify');

describe('slugify', function () {
  it('lowercases and dashes words', function () {
    expect(slugify('Hello World')).to.equal('hello-world');
  });
});
