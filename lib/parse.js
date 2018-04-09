'use strict'

exports.tokenise = function (code) {
  return code.match(/(?:#.+|[\[\]{}()]|\d+|[\w\*\+\/\.<>]+|"[^"]*?")/g)
    .map(match => {
      if (match[0] === '#') {
        return null
      }
      if (match[0] === '"') {
        return [':string', match.slice(1, -1)]
      }
      return match
    })
    .filter(Boolean)
}

function expect (tokens, tok) {
  if (tokens[0] !== tok) {
    throw new Error('Unexpected ' + JSON.stringify(tokens[0]) + ', expected ' + JSON.stringify(tok))
  }
  return tokens.slice(1)
}

function parseAtom (tokens) {
  const tok = tokens[0]
  if (tok === '(')        return parseFn(tokens)
  if (tok === '{')        return parseObject(tokens)
  if (tok === '[')        return parseArray(tokens)
  if (/^\d+$/.test(tok))  return [tokens.slice(1), Number(tok)]
  if (tok[0] === ':string')return [tokens.slice(1), tok]
  if (/^[\w\*\+\/\.]+$/.test(tok)) return [tokens.slice(1), String(tok)]
  throw new Error('Unexpected ' + JSON.stringify(tok))
}

function parseFn (tokens) {
  tokens = expect(tokens, '(')
  let fn = []
  let atom
  while (tokens[0] !== ')') { [tokens, atom] = parseAtom(tokens)
    fn = fn.concat([atom])
  }
  tokens = expect(tokens, ')')
  return [tokens, fn]
}

function parseArray (tokens) {
  tokens = expect(tokens, '[')
  let contents = []
  let atom
  while(tokens[0] !== ']') { [tokens, atom] = parseAtom(tokens)
    contents = contents.concat([atom])
  }
  tokens = expect(tokens, ']')
  return [tokens, [':array', ...contents]]
}

function parseObject (tokens) {
  tokens = expect(tokens, '{')
  let contents = []
  let atom
  while(tokens[0] !== '}') { [tokens, atom] = parseAtom(tokens)
    contents = contents.concat([atom])
  }
  tokens = expect(tokens, '}')
  return [tokens, [':object', ...contents]]
}

exports.parse = function (code) {
  let tokens = exports.tokenise(code)
  let out = ['do']
  let parsedFn
  while (tokens[0]) { [tokens, parsedFn] = parseAtom(tokens)
    out = out.concat([parsedFn])
  }
  expect(tokens, undefined)
  return out
}
