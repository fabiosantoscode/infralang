const assert = require('assert')
const parser = require('../lib/parse')

describe('parser', () => {
  it('can tokenise', () => {
    assert.deepEqual(
      parser.tokenise('(foo 1 2)'),
      ['(', 'foo', '1', '2', ')']
    )
    assert.deepEqual(
      parser.tokenise('(foo 1 2 (list 3))'),
      ['(', 'foo', '1', '2', '(', 'list', '3', ')', ')']
    )
    assert.deepEqual(
      parser.tokenise('(console.log "foo")'),
      ['(', 'console.log', [':string', 'foo'], ')']
    )
  })
  it('can parse', () => {
    assert.deepEqual(
      parser.parse('(foo 1 2 (list 3))'),
      ['do', ['foo', '1', '2', ['list', '3']]]
    )
  })
})
