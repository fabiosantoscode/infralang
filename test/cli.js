const assert = require('assert')
const cli = require('../lib/cli')

describe('cli', () => {
  it('can run code', () => {
    assert.equal(
      cli([ '-e', '(+ 1 1)']),
      2
    )
  })
})
