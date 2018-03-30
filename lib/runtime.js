
const SQS = new (require('aws-sdk/clients/sqs'))({
  apiVersion: '2012-11-05',
  region: process.env['AWS_DEFAULT_REGION']
})

class Queue {
  constructor(name) {
    this.name = name
    this.url = SQS.getQueueUrl({ QueueName: name }).promise()
    console.log('created queue ' + name)
  }
  on(event, fn) {
    if (event === 'message') {
      this.url.then(QueueUrl => SQS.receiveMessage({
        QueueUrl,
        WaitTimeSeconds: 30
      })).then(message => {
        fn(message)
      })
      return this
    }
    throw new Error('Unknown event ' + JSON.stringify(event))
  }
}

exports.queue = function createQueue(name) {
  return SQS.createQueue({
    QueueName: name
  }).promise().then(() => new Queue(name))
}

