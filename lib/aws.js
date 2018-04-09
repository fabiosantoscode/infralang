'use strict'

exports.SNS = new (require('aws-sdk/clients/sns'))({
  apiVersion: '2010-03-31'
})

exports.SQS = new (require('aws-sdk/clients/sqs'))({
  apiVersion: '2012-11-05'
})

exports.APIGateway = new (require('aws-sdk/clients/apigateway'))({
  apiVersion: '2015-07-09'
})

exports.Lambda = new (require('aws-sdk/clients/lambda'))({
  apiVersion: '2015-03-31'
})
