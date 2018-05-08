const assert = require('assert')
const cli = require('../lib/cli')
const sinon = require('sinon')

describe('cli', () => {
  if (!process.env.FAST_TESTS) {
    it('can run code', async () => {
      sinon.stub(console, 'log')
      await cli([ '-e', '(+ 1 1)'])
      assert.equal(
        console.log.lastCall.args[0],
        2
      )
      console.log.restore()
    })
    it('shows errors', async () => {
      sinon.stub(console, 'error')
      await cli([ '-e', '(throw "NO")'])
      assert.equal(
        console.error.lastCall.args[0],
        'NO'
      )
      console.error.restore()
    })
  }
  it('can compile code', async () => {
    assert((await cli(['-c', '(+ 1 1)'])).includes('return 1 + 1'))
  })
})
