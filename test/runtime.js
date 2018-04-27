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
  },
  Lambda: {
    getFunction: sinon.spy(() => ({ promise: () => ({ Configuration: { FunctionArn: 'arn' }}) })),
    createFunction: sinon.spy(() => ({ promise: () => null })),
    updateFunctionCode: sinon.spy(() => ({ promise: () => null }))
  },
  APIGateway: {
    getResources: sinon.spy(() => ({ promise: () => ({items: [{id: 'id', path: '/'}]}) })),
    createResource: sinon.spy(() => ({ promise: () => ({ id: 'resource-id'}) })),
    getRestApis: sinon.spy(() => ({ promise: () => ({items: [{name: 'http', id: 'api-id'}]}) })),
    getMethod: sinon.spy(() => ({ promise: () => Promise.reject(null) })),
    putMethod: sinon.spy(() => ({ promise: () => ({id: 'method-id'}) })),
    putIntegration: sinon.spy(() => ({ promise: () => ({id: 'integration-id'}) })),
    getDeployments: sinon.spy(() => ({ promise: () => Promise.resolve({items: [{description: 'infralang', id: 'deployment-id'}]}) })),
    getStages: sinon.spy(() => ({ promise: () => Promise.resolve({item: [{stageName: 'infralang', id: 'stage-id'}]}) }))
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
    await sns.subscribe(() => null)
    await sns.publish('hi')

    assert(proxyAws.SNS.publish.calledOnce)

    assert.deepEqual(proxyAws.SNS.subscribe.lastCall.args[0], {
      Protocol: 'lambda',
      TopicArn: '123',
      Endpoint: 'arn'
    })
  })
  it('interacts with API Gateway', async () => {
    const http = await runtime.http('http', 'foo')
    await http.onRequest(() => {
      console.log('foo')
    })
  })
})
