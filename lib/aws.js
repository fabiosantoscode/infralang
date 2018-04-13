'use strict'

Object.assign(exports, {
  SNS: new (require('aws-sdk/clients/sns'))({
    apiVersion: '2010-03-31'
  }),

  SQS: new (require('aws-sdk/clients/sqs'))({
    apiVersion: '2012-11-05'
  }),

  APIGateway: new (require('aws-sdk/clients/apigateway'))({
    apiVersion: '2015-07-09'
  }),

  Lambda: new (require('aws-sdk/clients/lambda'))({
    apiVersion: '2015-03-31'
  }),

  DynamoDB: new (require('aws-sdk/clients/dynamodb'))({
    apiVersion: '2012-08-10'
  }),
})
