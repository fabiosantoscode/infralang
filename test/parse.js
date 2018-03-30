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
    assert.deepEqual(
      parser.tokenise('[1 2 {3 4}]'),
      ['[', '1', '2', '{', 3, '4', '}', ']']
    )
  })
  it('can parse', () => {
    assert.deepEqual(
      parser.parse('(foo 1 2 (list 3))'),
      ['do', ['foo', '1', '2', ['list', '3']]]
    )
    assert.deepEqual(
      parser.parse('[1 2 {"foo" "bar"}]'),
      ['do', [':array', 1, 2, [':object', [':string', 'foo'], [':string', 'bar']]]]
    )
  })
})
