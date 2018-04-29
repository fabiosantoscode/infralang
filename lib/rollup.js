const fs = require('fs')
const rollup = require('rollup')

module.exports = async function (input) {
  const codefile = __dirname + '/../code.js'
  const outfile = __dirname + '/../code.build.js'
  fs.writeFileSync(codefile, input)
  const bundle = await rollup.rollup({
    input: codefile,
    output: {
      file: outfile,
      format: 'iife',
      name: 'bun'
    }
  })

  await bundle.write({
    file: outfile,
    format: 'iife'
  })

  const result = fs.readFileSync(outfile, 'utf-8')

  fs.unlinkSync(codefile)
  fs.unlinkSync(outfile)

  return result
}
