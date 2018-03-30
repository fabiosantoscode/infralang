const assert = require('assert')
const compile = require('../lib/compile')

describe('compiler', () => {
  it('compiles to JS', () => {
    assert.equal(
      compile('(+ 1 1)'),
      '1 + 1\n'
    )
    assert.equal(
      compile('(set foo "foo")\n(console.log foo)'),
      'var foo = "foo"\nconsole.log(foo)\n'
    )
    assert.equal(
      compile('(if 1 0 1)'),
      '(1 ? 0 : 1)\n'
    )
    assert.equal(
      compile('(fn foo (n) 1)\n(foo 1)'),
      'function foo(n) { return 1 }\nfoo(1)\n'
    )
  })
})
