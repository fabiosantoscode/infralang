const os = require('os')
const path = require('path')
const fs = require('fs')
const JSZip = require('jszip')
const fetch = require('node-fetch')

const compile = require('./compile')
const {SNS, SQS, APIGateway, Lambda, DynamoDB} = require('./aws')

class Queue {
  constructor (name) {
    this.name = name
    this.url = SQS.getQueueUrl({ QueueName: name }).promise().then(res => res.QueueUrl)
  }
  async send (message) {
    const url = await this.url
    await SQS.sendMessage({
      MessageBody: message,
      QueueUrl: url
    }).promise()
  }
}

exports.queue = async function createQueue (name) {
  await SQS.createQueue({
    QueueName: name
  }).promise()
  return new Queue(name)
}

class Sns {
  constructor (topic) {
    this.topic = topic
  }
  async subscribe (fn) {
    const lambdaFn = await createFunction(fn.name || 'onMessage', fn)
    const lambdaArn = (await lambdaFn.getFunction()).Configuration.FunctionArn
    const subscription = await SNS.subscribe({
      Protocol: 'lambda',
      TopicArn: this.topic.TopicArn,
      Endpoint: lambdaArn
    }).promise()
  }
  async publish (msg) {
    const pub = await SNS.publish({
      Message: msg,
      TopicArn: this.topic.TopicArn
    }).promise()
    return pub
  }
}

exports.sns = async function createSns (name) {
  const topic = await SNS.createTopic({
    Name: name
  }).promise()
  return new Sns(topic)
}

class HttpServer {
  constructor (name, path) {
    this.name = name
    this.path = path
  }
  async onRequest (fn) {
    let restApi = (await APIGateway.getRestApis().promise()).items
      .find(api => api.name === this.name)

    if (!restApi) {
      restApi = await APIGateway.createRestApi({
        name: this.name
      }).promise()
    }

    let resource = (await APIGateway.getResources({
      restApiId: restApi.id
    }).promise()).items
      .find(res => res.pathPart === this.path)

    if (!resource) {
      resource = await APIGateway.createResource({
        parentId: restApi.id,
        pathPart: this.path,
        restApiId: restApi.id
      }).promise()
    }

    const args = {
      restApiId: restApi.id,
      resourceId: resource.id,
      httpMethod: 'get',
      authorizationType: 'NONE'
    }
    const method = await APIGateway.getMethod(args).promise()
      .catch(() => APIGateway.putMethod(args).promise())

    const lambdaFn = await createFunction(fn.name || 'onRequest', fn)
    const integration = await APIGateway.putIntegration({
      type: 'AWS',
      httpMethod: 'GET',
      integrationHttpMethod: 'GET',
      resourceId: resource.id,
      restApiId: restApi.id,
      uri: 'arn:aws:apigateway:' + process.env.AWS_REGION + ':lambda:path/2015-03-31/functions/' + (await lambdaFn.getFunction()).Configuration.FunctionArn,
      credentials: 'arn:aws:iam::962250881704:user/lambda'
    }).promise()
  }
}

exports.http = async function createHttpEndpoint (name, path) {
  return new HttpServer(name, path)
}

class DynamoTable {
  constructor (tableName, params) {
    this.tableName = tableName
    this.params = params
  }
  async putItem (Item) {
    try {
      await DynamoDB.createTable(Object.assign({
        TableName: this.tableName
      }, this.params)).promise()
    } catch(e) {
      if (e.code !== 'ResourceInUseException') {
        throw e
      }
    }

    return await DynamoDB.putItem({ Item, TableName: this.tableName }).promise()
  }
}

exports.dynamodb = async (TableName, {AttributeDefinitions, KeySchema, ProvisionedThroughput}) => {
  return new DynamoTable(TableName, {AttributeDefinitions, KeySchema, ProvisionedThroughput})
}

exports.fetch = fetch

class LambdaFunction {
  constructor (name) {
    this.name = name
  }
  async call (Payload) {
    return await Lambda.invoke({
        FunctionName: this.name,
      Payload}).promise()
  }
  async getFunction (...args) {
    return await Lambda.getFunction({
        FunctionName: this.name
      }).promise()
  }
}

exports.lambda = async (name, fn) => {
  await createFunction(name, fn)

  return new LambdaFunction(name)
}

exports.dependencies = (deps, fn) => {
  fn.$dependencies$ = deps
  return fn
}

async function createFunction (name, code) {
  const zip = new JSZip()

  if (code.$dependencies$) {
    code += '\n' + code.$dependencies$.join('\n')
  }

  zip.file('index.js', 'const $runtime = ' + compile.getRuntime + '\nexports.func = ' + code)

  ;(function copyDir (zipDir, dir) {
    fs.readdirSync(dir).forEach(file => {
      const stat = fs.lstatSync(dir + '/' + file)
      if (stat.isFile()) {
        zip.folder(zipDir).file(file, fs.readFileSync(dir + '/' + file, 'utf-8'))
      } else if (stat.isDirectory()) {
        copyDir(zipDir + '/' + file, dir + '/' + file)
      }
    })
  }('node_modules/infralang', __dirname + '/..'))

  const ZipFile = Buffer.from(await zip.generateAsync({type: 'uint8array'}))

  let func
  try {
    func = await Lambda.getFunction({ FunctionName: name }).promise()
  } catch(e) {
    func = await Lambda.createFunction({
      FunctionName: name,
      Code: { ZipFile},
      Timeout: 300,
      Handler: 'index.func',
      Runtime: 'nodejs8.10',
      Role: 'arn:aws:iam::962250881704:role/infralang'
    }).promise()
  }

  if (func) {
    await Lambda.updateFunctionCode({ FunctionName: name, ZipFile}).promise()
  }

  return new LambdaFunction(name)
}
