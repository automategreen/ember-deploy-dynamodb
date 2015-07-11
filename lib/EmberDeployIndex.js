'use strict';
module.exports = function (config) {

  var dynamoose = require('dynamoose');
  var Schema = dynamoose.Schema;

  dynamoose.AWS.config.update(config.AWS);
  if(config.local) {
    dynamoose.local();
  }
  if(config.defaults) {
    dynamoose.setDefaults(config.defaults);
  }


  var emberDeploySchema = new Schema({
    manifest: {
      type: String,
      hashKey: true
    },
    key: {
      type: String,
      rangeKey: true
    },
    created: {
      type: Date,
      default: Date.now
    },
    index: String,
    ref: String
  });

  var modelName = 'EmberDeployIndex';

  var EmberDeployIndex = dynamoose.model(modelName, emberDeploySchema);


  return EmberDeployIndex;
};