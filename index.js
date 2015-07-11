/* jshint node: true */
'use strict';
var DynamoDBAdapter = require('./lib/dynamodb');

function EmberDeployDynamoDB() {
  this.name = 'ember-deploy-dynamodb';
  this.type = 'ember-deploy-addon';

  this.adapters = {
    index: {
      'dynamodb': DynamoDBAdapter
    }
  };
}

module.exports = EmberDeployDynamoDB;
module.exports.Index = require('./lib/EmberDeployIndex');
