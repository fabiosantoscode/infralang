const test = require('blue-tape')
const cli = require('../lib/cli')

test('CLI can run code', async (t) => {
  t.equal(
    await cli([ '-e', '(+ 1 1)']),
    2
  )
})
test('CLI can compile code', (t) => {
  t.equal(
    cli(['-c', '(+ 1 1)']),
    '(async () => {\n\n  return 1 + 1\n})().catch(error => { console.error(error) })'
  )
  t.end()
})
