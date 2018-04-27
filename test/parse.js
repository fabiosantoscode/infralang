const test = require('blue-tape')
const parser = require('../lib/parse')

test('parser can tokenise', (t) => {
  t.deepEqual(
    parser.tokenise('(foo 1 2)'),
    ['(', 'foo', '1', '2', ')']
  )
  t.deepEqual(
    parser.tokenise('(foo 1 2 (list 3))'),
    ['(', 'foo', '1', '2', '(', 'list', '3', ')', ')']
  )
  t.deepEqual(
    parser.tokenise('(console.log "foo")'),
    ['(', 'console.log', [':string', 'foo'], ')']
  )
  t.deepEqual(
    parser.tokenise('[1 2 {3 4}]'),
    ['[', '1', '2', '{', '3', '4', '}', ']']
  )
  t.deepEqual(
    parser.tokenise('"hello \\"world\\""'),
    [[':string', 'hello "world"']]
  )
  t.deepEqual(
    parser.tokenise('/.p[]/g'),
    [[':regex', '/.p[]/g']]
  )
  t.end()
})
test('parser can parse', (t) => {
  t.deepEqual(
    parser.parse('(foo 1 2 (list 3))'),
    ['do', ['foo', 1, 2, ['list', 3]]]
  )
  t.deepEqual(
    parser.parse('[1 2 {"foo" "bar"}]'),
    ['do', [':array', 1, 2, [':object', [':string', 'foo'], [':string', 'bar']]]]
  )
  t.deepEqual(
    parser.parse('/ab.+c/'),
    ['do', [':regex', '/ab.+c/']]
  )
  t.deepEqual(
    parser.parse('(+ 1 (- 2 (/ 3 (* 4 0))))'),
    ['do', ['+', 1, ['-', 2, ['/', 3, ['*', 4, 0]]]]]
  )
  t.end()
})
test('parser ignores comments', (t) => {
  t.deepEqual(
    parser.parse('# foo bar\n(baz)'),
    ['do', ['baz']]
  )
  t.end()
})
