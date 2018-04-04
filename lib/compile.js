const assert = require('assert')
const indent = require('indent')
const runtime = require('./runtime')
const { parse } = require('./parse')

const builtins = {
  set(name, val) {
    return 'var ' + name + ' = await ' + val
  },
  if(cond, then, otherwise) {
    return `(${cond} ? ${then} : ${otherwise || 'undefined'})`
  },
  fn(...args) {
    if (Array.isArray(args[0])) {
      args.unshift('')
    }
    const [name, params, ...code] = args
    if (params[0] === ':array') params.splice(0, 1)
    const codeCompiled = code.map(compileAtom)
    const finalCode = codeCompiled[codeCompiled.length - 1]
    const restCode = codeCompiled.length > 1 ? codeCompiled.slice(-1) : []
    const head = `async function ${name}(${params.join(', ')}) {\n`
    const body = `${indent(params.map(param => `${param} = await ${param}`).join('; '), 2)}${params.length ? ';\n' : ''}${indent(restCode.join(';\n'), 2)}${restCode.length ? ';\n' : ''}${indent('', 2)}return ${finalCode}\n`
    const tail = '}'
    return head + indent(body, 2) + tail
  }
}

function compileForm(atom) {
  let code = ''
  const [fn, ...args] = atom
  if (fn in builtins) {
    code += builtins[fn](...args.map(fn === 'fn' ? x => x : compileAtom))
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

