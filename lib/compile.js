const assert = require('assert')
const indent = require('indent')
const runtime = require('./runtime')
const rollup = require('./rollup')
const { parse } = require('./parse')

let wholeCode = null

const getRuntime = 'require("infralang/lib/runtime")'

const builtins = {
  set(name, val) {
    return `var ${name} = ${val}`
  },
  if(cond, then, otherwise) {
    return `(${cond} ? ${then} : ${otherwise || 'undefined'})`
  }
}

function makeBody (params, code) {
  const finalCode = code[code.length - 1]
  const restCode = code.length > 1 ? code.slice(0, -1) : []
  return indent(`${restCode.join('\n')}${restCode.length ? '\n' : ''}return ${finalCode}
`)
}

function computeDependencies (code, params) {
  let names = []

  code.forEach((form) => {
    if (!form.length) return
    let [fn, ...args] = form
    if (fn === ':string' || fn === ':array' || fn === ':object') { return }
    if (fn.split('.')) fn = fn.split('.')[0]

    if (params.indexOf(fn) === -1) {
      const foundCode = wholeCode.find(([ins, arg1]) => {
        if (ins === 'set' && arg1 === fn) {
          return true
        }
      })
      if (foundCode) names.push(compileAtom(foundCode))
    }
  })

  return names
}

const builtinsNoCompile = {
  fn(...args) {
    if (Array.isArray(args[0])) {
      args.unshift('')
    }
    const [name, params, ...code] = args
    if (params[0] === ':array') params.shift()
    const codeCompiled = code.map(compileAtom)
    const head = `async function ${name}(${params.join(', ')}) {
`
    const body = makeBody(params, codeCompiled)
    const tail = '}'
    const fnCode = head + body + tail

    const dependencies = computeDependencies(code, params)

    if (dependencies.length) {
      return `${getRuntime}.dependencies(${JSON.stringify(dependencies)}, ${fnCode})`
    }

    return fnCode
  },
  let(assignments, ...code) {
    if (assignments[0] === ':array') assignments.shift()
    const names = assignments.filter((_, i) => i % 2 === 0)
    const values = assignments.filter((_, i) => i % 2 !== 0)
    return `await (async function(${names.join(', ')}) {
${makeBody(names, code.map(compileAtom))}
})(${values.map(compileAtom).join(', ')})`
  },
  loop(bindings, ...code) {
    if (bindings[0] === ':array') { bindings.shift() }
    const names = bindings.filter((_, i) => i % 2 === 0)
    const values = bindings.filter((_, i) => i % 2 !== 0)
    return `await (async function recur(${names.join(', ')}) {
${makeBody(names, code.map(compileAtom))}
})(${values.map(compileAtom).join(', ')})`
  }
}

function compileForm (atom) {
  let code = ''
  const [fn, ...args] = atom
  if (fn in builtinsNoCompile) {
    code += builtinsNoCompile[fn](...args)
  } else if (fn in builtins) {
    code += builtins[fn](...args.map(compileAtom))
  } else if (fn in runtime) {
    code += `await ${getRuntime}.${fn}(${args.map(compileAtom).join(', ')})`
  } else if (/^[\w\.]+$/.test(fn)) {
    code += `await ${fn}(${args.map(compileAtom).join(', ')})`
  } else if (/^[\+\-\*\/<>]$/.test(fn)) {
    code += args.map(compileAtom).join(` ${fn} `)
  } else {
    throw new Error('unexpected ' + JSON.stringify(fn))
  }
  return code
}

function joinObject (accum, item, all) {
  return accum.concat(item + (accum.length % 2 ? ', ' : ': '))
}

function compileAtom (atom) {
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

module.exports = async function compile (code, wrapper) {
  const [main, ...program] = parse(code)
  wholeCode = program
  const restProgram = program.map(compileAtom)
  if (wrapper === false) {
    return restProgram.join('\n') + '\n'
  }
  const finalProgram = restProgram[restProgram.length - 1]
  restProgram.splice(restProgram.length - 1, 1)
  assert.equal(main, 'do')
  const lastLine = /^var/.test(finalProgram) ? finalProgram : 'return ' + finalProgram
  wholeCode = null
  return (await rollup('/*INFRALANGSTART*/ (async () => {\n'
    + indent(restProgram.join('\n')) + '\n'
    + indent(lastLine) + '\n'
    + '})().catch(error => { console.error(error) })')).replace('/*INFRALANGSTART*/', 'return')
}

Object.assign(module.exports, {getRuntime})
