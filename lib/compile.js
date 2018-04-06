const assert = require('assert')
const indent = require('indent')
const runtime = require('./runtime')
const { parse } = require('./parse')

const builtins = {
  set(name, val) {
    return `var ${name} = await ${val}`
  },
  if(cond, then, otherwise) {
    return `(${cond} ? ${then} : ${otherwise || 'undefined'})`
  },
}

function makeBody(params, code) {
  const finalCode = code[code.length - 1]
  const restCode = code.length > 1 ? code.slice(0, -1) : []
  return indent(`${restCode.join('\n')}${restCode.length ? '\n' : ''}return ${finalCode}\n`)
}

const builtinsNoCompile = {
  fn(...args) {
    if (Array.isArray(args[0])) {
      args.unshift('')
    }
    const [name, params, ...code] = args
    if (params[0] === ':array') params.splice(0, 1)
    const codeCompiled = code.map(compileAtom)
    const head = `async function ${name}(${params.join(', ')}) {\n`
    const body = makeBody(params, codeCompiled)
    const tail = '}'
    return head + body + tail
  },
  let(assignments, ...code) {
    if (assignments[0] === ':array') assignments.shift()
    const names = assignments.filter((_, i) => i % 2 === 0)
    const values = assignments.filter((_, i) => i % 2 !== 0)
    return 'await (async function(' + names.join(', ') + ') {\n'
      + makeBody(names, code.map(compileAtom)) + '\n'
      + '})(' + values.join(', ') + ')'
  },
  loop(bindings, ...code) {
    if (bindings[0] === ':array') { bindings.shift() }
    const names = bindings.filter((_, i) => i % 2 === 0)
    const values = bindings.filter((_, i) => i % 2 !== 0)
    return `await (async function recur(${names.join(', ')}) {
${makeBody(names, code.map(compileAtom))}
})(${values.join(', ')})`
  }
}

function compileForm(atom) {
  let code = ''
  const [fn, ...args] = atom
  if (fn in builtinsNoCompile) {
    code += builtinsNoCompile[fn](...args)
  } else if (fn in builtins) {
    code += builtins[fn](...args.map(compileAtom))
  } else if (fn in runtime) {
    code += `require("${__dirname}/runtime").${fn}(${args.map(compileAtom).join(', ')})`
  } else if (/^[\w\.]+$/.test(fn)) {
    code += `await ${fn}(${args.map(compileAtom).join(', ')})`
  } else if (/^[\+\-\*\/<>]$/.test(fn)) {
    code += args.map(compileAtom).join(` ${fn} `)
  } else {
    throw new Error('unexpected ' + JSON.stringify(fn))
  }
  return code
}

function joinObject(accum, item, all) {
  return accum.concat(item + (accum.length % 2 ? ', ' : ': '))
}

function compileAtom(atom) {
  if (atom[0] === ':string')  return JSON.stringify(atom[1])
  if (atom[0] === ':array')   return '[' + atom.slice(1)
                                .map(compileAtom)
                                .join(', ') + ']'
  if (atom[0] === ':object')  return '{' + atom.slice(1)
                                .map(compileAtom)
                                .reduce(joinObject, [])
                                .join('')
                                .replace(/, $/g, '') + '}'
  if (Array.isArray(atom))    return compileForm(atom)
  if (/^\d+$/.test(atom))     return atom
  if (/^[\w\.]+$/.test(atom)) return atom
  throw new Error('Unexpected ' + JSON.stringify(atom))
}

module.exports = function compile(code, wrapper) {
  const [main, ...program] = parse(code)
  const restProgram = program.map(compileAtom)
  if (wrapper === false) {
    return restProgram.join('\n') + '\n'
  }
  const finalProgram = restProgram[restProgram.length - 1]
  restProgram.splice(restProgram.length - 1, 1)
  assert.equal(main, 'do')
  const lastLine = /^var/.test(finalProgram) ? finalProgram : 'return ' + finalProgram
  return '(async () => {\n'
    + indent(restProgram.join('\n'), 2) + '\n'
    + indent(lastLine, 2) + '\n'
    + '})().catch(error => { console.error(error) })'
}

