const fs = require('fs')
const yargs = require('yargs')
const compile = require('./compile')

const createParser = (argv) => yargs
  .usage('$0 file.inf')
  .usage('$0 -e <code>')
  .usage('$0 -c <code>')
  .boolean('eval')
  .boolean('compile')
  .alias('e', 'eval')
  .alias('c', 'compile')

module.exports = function cli(argv) {
  const parser = createParser(argv)
  const args = parser.parse(argv)

  if (args.c) {
    return compile(args._[0])
  } else if (args.e) {
    return eval(compile(args._[0]))
  } else if (args._[0]) {
    return eval(fs.readFileSync(args._[0], 'utf-8'))
  } else {
    parser.showHelp()
  }
}
