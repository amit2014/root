'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;


var ProjectSchema = new Schema({
  created: {
    type: Date
  },
  updated: {
    type: Date
  },  
  title: {
    type: String,
    required: true    
  },
  parent : {
    type: Schema.ObjectId,
    ref: 'Project'
  },
  creator: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  manager: {
    type: Schema.ObjectId,
    ref: 'User'
  }
});

/**
 * Validations
 */
ProjectSchema.path('title').validate(function(title) {
  return !!title;
}, 'Title cannot be blank');

/**
 * Statics
 */
ProjectSchema.statics.load = function(id, cb) {
  this.findOne({
    _id: id
  }).populate('creator', 'name username').exec(cb);
};

mongoose.model('Project', ProjectSchema);
