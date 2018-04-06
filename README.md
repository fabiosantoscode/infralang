
# infralang

Create your code on AWS lambda in a single place!

## infralang -e

```bash
♥  bin/infralang -e '(+ 1 1)'
2
♥  bin/infralang -e '(+ 2 4)'
6
```

## infralang -c

```bash
♥  bin/infralang -c '(console.log (+ 2 4))'
(async () => {
 const $runtime = require("/home/fabio/devel/infralang/lib/runtime")

 return await console.log(2 + 4)
})().catch(error => { console.error(error) })
```

