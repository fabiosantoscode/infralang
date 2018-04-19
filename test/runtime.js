'use strict'

const assert = require('assert')
const sinon = require('sinon')
const proxyQuire = require('proxyquire')
const proxyAws = {
  SQS: {
    createQueue: sinon.spy(() => ({ promise: () => null })),
    getQueueUrl: sinon.spy(() => ({ promise: () => Promise.resolve('')})),
    sendMessage: sinon.spy(() => ({ promise: () => null }))
  },
  SNS: {
    subscribe: sinon.spy(() => ({ promise: () => null })),
    publish: sinon.spy(() => ({ promise: () => null })),
    createTopic: sinon.spy((topic) => ({ promise: () => ({TopicArn: '123'})}))
  }
}
const runtime = proxyQuire('../lib/runtime', {
  './aws': proxyAws
})

describe('runtime', () => {
  it('can create queues', async () => {
    const q = await runtime.queue('test-q')

    await q.send('hi')

    assert(proxyAws.SQS.createQueue.calledOnce)
    assert.deepEqual(proxyAws.SQS.sendMessage.lastCall.args[0], {
      MessageBody: 'hi',
      QueueUrl: undefined
    })
  })
  it('interacts with Sns', async () => {
    const sns = await runtime.sns('test-s')
    // await sns.subscribe(() => null)
    await sns.publish('hi')

    assert(proxyAws.SNS.publish.calledOnce)

    0 && assert.deepEqual(proxyAws.SNS.subscribe.lastCall.args[0], {
      Protocol: 'lambda',
      TopicArn: '123',
      Endpoint: null
    })
  })
})
