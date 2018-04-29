const fs = require('fs')
const path = require('path')
const webpack = require('webpack')

module.exports = async function (input) {
  const codefile = __dirname + '/../code.js'
  const outfile = __dirname + '/../code.build.js'
  fs.writeFileSync(codefile, input)

  await new Promise((resolve, reject) => {
    webpack({
      devtool: false,
      target: 'node',
      mode: 'production',
      optimization: {
        minimize: false
      },
      entry: codefile,
      output: {
        filename: path.basename(outfile),
        path: path.dirname(outfile),
        libraryTarget: 'umd'
      },
      resolve: {
        alias: {
          'infralang': __dirname + '/..'
        }
      }
    }, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

  const result = fs.readFileSync(outfile, 'utf-8')

  fs.unlinkSync(codefile)
  fs.unlinkSync(outfile)

  return result
}
