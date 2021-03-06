const os = require('os')
const path = require('path')
const fs = require('fs')
const indent = require('indent')
const JSZip = require('jszip')
const apigClientFactory = require('aws-api-gateway-client').default
const fetch = require('node-fetch')

const webpack = require('./webpack')
const compile = require('./compile')
const {SNS, SQS, APIGateway, Lambda, DynamoDB} = require('./aws')

const {accessKey, secretKey, region} = {
  accessKey: process.env['AWS_ACCESS_KEY_ID'],
  secretKey: process.env['AWS_SECRET_ACCESS_KEY'],
  region: process.env['AWS_REGION'] || process.env['AWS_DEFAULT_REGION']
}

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
  async getUrl () {
    const restApi = await this.getRestApi()
    if (restApi) {
      return `https://${restApi.id}.execute-api.${region}.amazonaws.com/infralang/${this.path}`
    }
  }
  async getRestApi () {
    let restApi = this.restApi || (await APIGateway.getRestApis().promise()).items
      .find(api => api.name === this.name)

    if (!restApi) {
      restApi = await APIGateway.createRestApi({
        name: this.name
      }).promise()
    }

    return this.restApi = restApi
  }
  async invoke () {
    const apigClient = apigClientFactory.newClient({
      accessKey,
      secretKey,
      region,
      invokeUrl: await this.getUrl(),
      retries: 4
    })
    await apigClient.invokeApi({}, '', 'GET', {}, {})
  }
  async onRequest (fn) {
    const restApi = await this.getRestApi()

    this.restApi = restApi

    const allResources = (await APIGateway.getResources({
      restApiId: restApi.id
    }).promise()).items

    let resource = allResources
      .find(res => res.pathPart === this.path)

    const rootResource = allResources.find(res => res.path === '/')

    if (!resource) {
      resource = await APIGateway.createResource({
        restApiId: restApi.id,
        parentId: rootResource.id,
        pathPart: this.path
      }).promise()
    }

    const args = {
      restApiId: restApi.id,
      resourceId: resource.id,
      httpMethod: 'get',
      authorizationType: 'NONE'
    }

    const [method, lambdaFn] = await Promise.all([
      APIGateway.getMethod(args).promise()
        .catch(() => APIGateway.putMethod(args).promise()),
      createFunction(fn.name || 'onRequest', fn)
    ])

    const integration = await APIGateway.putIntegration({
      type: 'AWS',
      httpMethod: 'GET',
      integrationHttpMethod: 'GET',
      resourceId: resource.id,
      restApiId: restApi.id,
      uri: 'arn:aws:apigateway:' + process.env.AWS_REGION + ':lambda:path/2015-03-31/functions/' + (await lambdaFn.getFunction()).Configuration.FunctionArn,
      credentials: 'arn:aws:iam::962250881704:user/lambda'
    }).promise()

    const deployment = await (APIGateway.getDeployments({
      restApiId: restApi.id
    }).promise())
      .then(dep => dep.items.find(dep => dep.description === 'infralang')
        || APIGateway.createDeployment({
          restApiId: restApi.id,
          description: 'infralang'
        }).promise()
    )
    const stage = await APIGateway.getStages({
      restApiId: restApi.id
    }).promise()
      .then(stages => stages.item.find(s => s.stageName === 'infralang')
        || APIGateway.createStage({
          restApiId: restApi.id,
          stageName: 'infralang',
          deploymentId: deployment.id
        }).promise()
    )
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

  code = `exports.func = (async () => {
${indent(code.toString())}
})()`

  code = await webpack(code)

  zip.file('index.js', code)

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

exports.throw = (msg) => {
  throw msg
}
