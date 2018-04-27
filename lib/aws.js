'use strict'

const AWS = require('aws-sdk')

Object.assign(exports, {
  SNS: new AWS.SNS({
    apiVersion: '2010-03-31'
  }),

  SQS: new AWS.SQS({
    apiVersion: '2012-11-05'
  }),

  APIGateway: new AWS.APIGateway({
    apiVersion: '2015-07-09'
  }),

  Lambda: new AWS.Lambda({
    apiVersion: '2015-03-31'
  }),

  DynamoDB: new AWS.DynamoDB({
    apiVersion: '2012-08-10'
  })
})
