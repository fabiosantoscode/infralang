const assert = require('assert')
const compile = (s) => require('../lib/compile')(s, false)

describe('compiler', () => {
  it('compiles to JS', async () => {
    assert.equal(
      await compile('(+ 1 1)'),
      '1 + 1\n'
    )
    assert.equal(
      await compile('(set foo "foo")\n(console.log foo)'),
      'var foo = "foo"\nawait console.log(foo)\n'
    )
    assert.equal(
      await compile('(if 1 0 1)'),
      '(1 ? 0 : 1)\n'
    )
    assert.equal(
      await compile('(fn foo (n) 1)\n(foo 1)'),
      `async function foo(n) {
  return 1
}
await foo(1)
`
    )
    assert.equal(
      await compile('(fn foo [n] 1)\n(foo 1)'),
      'async function foo(n) {\n  return 1\n}\nawait foo(1)\n'
    )
    assert.equal(
      await compile('(map (fn foo (n) 1))'),
      'await map(async function foo(n) {\n  return 1\n})\n'
    )
    assert.equal(
      await compile('(set x [1 2 3])'),
      'var x = [1, 2, 3]\n'
    )
    assert.equal(
      await compile('(set x {"foo" "bar"})'),
      'var x = {"foo": "bar"}\n'
    )
  })
  it('compiles dependencies in the closure', async () => {
    assert.equal(
      await compile('(set q (queue "123"))\n(console.log (fn [msg] (q.send "hi")))'),
      'var q = await require("infralang/lib/runtime").queue("123")\nawait console.log(require("infralang/lib/runtime").dependencies(["var q = await require(\\"infralang/lib/runtime\\").queue(\\"123\\")"], async function (msg) {\n  return await q.send("hi")\n}))\n'
    )
  })
  it('compiles complex code', async () => {
    assert.equal(
      await compile(`(fn [] (console.log 1))`),
      'async function () {\n  return await console.log(1)\n}\n'
    )
  })
})
