const assert = require('assert')
const compile = (s) => require('../lib/compile')(s, false)

describe('compiler', () => {
  it('compiles to JS', () => {
    assert.equal(
      compile('(+ 1 1)'),
      '1 + 1\n'
    )
    assert.equal(
      compile('(set foo "foo")\n(console.log foo)'),
      'var foo = await "foo"\nawait console.log(foo)\n'
    )
    assert.equal(
      compile('(if 1 0 1)'),
      '(1 ? 0 : 1)\n'
    )
    assert.equal(
      compile('(fn foo (n) 1)\n(foo 1)'),
      'async function foo(n) { n = await n; return 1 }\nawait foo(1)\n'
    )
    assert.equal(
      compile('(fn foo [n] 1)\n(foo 1)'),
      'async function foo(n) { n = await n; return 1 }\nawait foo(1)\n'
    )
    assert.equal(
      compile('(map (fn foo (n) 1))'),
      'await map(async function foo(n) { n = await n; return 1 })\n'
    )
    assert.equal(
      compile('(set x [1 2 3])'),
      'var x = await [1, 2, 3]\n'
    )
    assert.equal(
      compile('(set x {"foo" "bar"})'),
      'var x = await {"foo": "bar"}\n'
    )
  })
  it('compiles complex code', () => {
    assert.equal(
      compile(`(fn [] (console.log 1))`),
      'async function () { ; return await console.log(1) }\n'
    )
  })
})
