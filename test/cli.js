const assert = require('assert')
const cli = require('../lib/cli')

describe('cli', () => {
  it('can run code', async () => {
    assert.equal(
      await cli([ '-e', '(+ 1 1)']),
      2
    )
  })
  it('can compile code', () => {
    assert.equal(
      cli(['-c', '(+ 1 1)']),
      '(async () => {\nreturn 1 + 1})()'
    )
  })
})
