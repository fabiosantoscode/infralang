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
    assert.deepEqual(
      parser.tokenise('"hello \\"world\\""'),
      [[':string', 'hello "world"']]
    )
    assert.deepEqual(
      parser.tokenise('/.p[]/g'),
      [[':regex', '/.p[]/g']]
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
    assert.deepEqual(
      parser.parse('/ab.+c/'),
      ['do', [':regex', '/ab.+c/']]
    )
    assert.deepEqual(
      parser.parse('(+ 1 (- 2 (/ 3 (* 4 0))))'),
      ['do', ['+', 1, ['-', 2, ['/', 3, ['*', 4, 0]]]]]
    )
    assert.deepEqual(
      parser.parse('(throw "no")'),
      ['do', ['throw', [':string', 'no']]]
    )
  })
  it('ignores comments', () => {
    assert.deepEqual(
      parser.parse('# foo bar\n(baz)'),
      ['do', ['baz']]
    )
  })
})
