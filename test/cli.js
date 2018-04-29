const assert = require('assert')
const cli = require('../lib/cli')
const sinon = require('sinon')

describe('cli', () => {
  it('can run code', async () => {
    sinon.stub(console, 'log')
    await cli([ '-e', '(+ 1 1)'])
    assert.equal(
      console.log.lastCall.args[0],
      2
    )
    console.log.restore()
  })
  it('can compile code', async () => {
    assert((await cli(['-c', '(+ 1 1)'])).includes('return 1 + 1'))
  })
})
