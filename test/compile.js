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
      `async function foo(n) {
  return 1
}
await foo(1)
`
    )
    assert.equal(
      compile('(fn foo [n] 1)\n(foo 1)'),
      'async function foo(n) {\n  return 1\n}\nawait foo(1)\n'
    )
    assert.equal(
      compile('(map (fn foo (n) 1))'),
      'await map(async function foo(n) {\n  return 1\n})\n'
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
  it('compiles dependencies in the closure', () => {
    assert.equal(
      compile('(set q (queue "123"))\n(console.log (fn [msg] (q.send "hi")))'),
      'var q = await require("infralang/lib/runtime").queue("123")\nawait console.log(require("infralang/lib/runtime").dependencies(["var q = await require(\\"infralang/lib/runtime\\").queue(\\"123\\")"], async function (msg) {\n  return await q.send("hi")\n}))\n'
    )
  })
  it('compiles complex code', () => {
    assert.equal(
      compile(`(fn [] (console.log 1))`),
      'async function () {\n  return await console.log(1)\n}\n'
    )
  })
})
