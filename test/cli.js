const assert = require('assert')
const cli = require('../lib/cli')

describe('cli', () => {
  it('can run code', async () => {
    assert.equal(
      await cli([ '-e', '(+ 1 1)']),
      2
    )
  })
  it('can compile code', async () => {
    assert((await cli(['-c', '(+ 1 1)'])).includes('return 1 + 1'))
  })
})
