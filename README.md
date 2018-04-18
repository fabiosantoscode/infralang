
# infralang

[![Build Status](https://travis-ci.org/fabiosantoscode/infralang.svg?branch=master)](https://travis-ci.org/fabiosantoscode/infralang)

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

## (set variableName value)

```lisp
(set variablename (sns "sns-topic"))
```

## (loop [name value name2 value2] (recur))

```lisp
(set list [1 2 3])

(loop [l list]
    (console.log l)
    (if l.length
        (recur (l.slice 1))))
```

## (fn [arg1 arg2 ...] code...)

```lisp
(fn [msg] onMessage
    (notif.publish {hello: "world"}))

(set notif (sns "sns-topic"))

(notif.subscribe onMessage)
```

## (fetch "url")

```lisp
(fetch "http://www.example.com")
```

## lambda

```lisp
(set x (lambda "functionName" (fn [x]
    (console.log "hello" x))))

(x.call "param")
```

