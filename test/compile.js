const test = require('blue-tape')
const compile = (s) => require('../lib/compile')(s, false)

test('compiler compiles to JS', (t) => {
  t.equal(
    compile('(+ 1 1)'),
    '1 + 1\n'
  )
  t.equal(
    compile('(set foo "foo")\n(console.log foo)'),
    'var foo = "foo"\nawait console.log(foo)\n'
  )
  t.equal(
    compile('(if 1 0 1)'),
    '(1 ? 0 : 1)\n'
  )
  t.equal(
    compile('(fn foo (n) 1)\n(foo 1)'),
    `async function foo(n) {
  return 1
}
await foo(1)
`
  )
  t.equal(
    compile('(fn foo [n] 1)\n(foo 1)'),
    'async function foo(n) {\n  return 1\n}\nawait foo(1)\n'
  )
  t.equal(
    compile('(map (fn foo (n) 1))'),
    'await map(async function foo(n) {\n  return 1\n})\n'
  )
  t.equal(
    compile('(set x [1 2 3])'),
    'var x = [1, 2, 3]\n'
  )
  t.equal(
    compile('(set x {"foo" "bar"})'),
    'var x = {"foo": "bar"}\n'
  )
  t.end()
})
test('compiler compiles dependencies in the closure', (t) => {
  t.equal(
    compile('(set q (queue "123"))\n(console.log (fn [msg] (q.send "hi")))'),
    'var q = await require("infralang/lib/runtime").queue("123")\nawait console.log(require("infralang/lib/runtime").dependencies(["var q = await require(\\"infralang/lib/runtime\\").queue(\\"123\\")"], async function (msg) {\n  return await q.send("hi")\n}))\n'
  )
  t.end()
})
test('compiler compiles complex code', (t) => {
  t.equal(
    compile(`(fn [] (console.log 1))`),
    'async function () {\n  return await console.log(1)\n}\n'
  )
  t.end()
})
