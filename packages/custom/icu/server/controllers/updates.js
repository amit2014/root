'use strict';

var utils = require('./utils');

var mongoose = require('mongoose'),
  ObjectId = require('mongoose').Types.ObjectId;


var options = {
  includes: 'creator userObj'
};

exports.defaultOptions = options;

var updateService = require('../services/updates.js'),
  crud = require('../controllers/crud.js'),
  update = crud('updates', options),
  Update = require('../models/update'),
  Task = require('../models/task'),
  Attachement = require('../models/attachment'),
  UpdateArchive = mongoose.model('update_archive'),
  elasticsearch = require('./elasticsearch'),
  mean = require('meanio'),
  _ = require('lodash'),
  q = require('q');

var entityIssueMap = {
  tasks: 'task',
  projects: 'project',
  discussions: 'discussion',
  offices: 'office',
  folders: 'folder',
  officeDocuments:'Document',
  templateDocs:'TemplateDoc'
};

Object.keys(update).forEach(function(methodName) {
  exports[methodName] = update[methodName];
});

exports.getAttachmentsForUpdate = function(req, res, next) {
  if (req.locals.error) {
    return next();
  }

  var query = {
    issueId: req.locals.result._id
  };
  
  if (_.isArray(req.locals.result)) {
    var ids = _(req.locals.result).pluck('_id').value();
    query = {
      issueId: {
        $in: ids
      }
    };
  }

  Attachement.find(query).then(function(attachments) {
    if (_.isArray(req.locals.result)) {
      _.each(req.locals.result, function(i) {
        i.attachments = _.filter(attachments, function(a) {
          return a.issueId.toString() === i._id.toString();
        });
      });

      next();
    } else {
      req.locals.result.attachments = attachments;
      next();
    }
  });
};

exports.getByEntity = function(req, res, next) {
  if (req.locals.error) {
    return next();
  }

  var type = entityIssueMap[req.params.entity];
  if(type=='Document'){
    type="officeDocuments";
  }
  if(type=='TemplateDoc'){
    type='templateDoc';
  }
  Update.find({
    issue: type,
    issueId: req.params.id
  }).populate('userObj', 'name lastname profile').populate('creator', 'name lastname profile').then(function(updates) {
    req.locals.result = updates;
    next();
  });
};

exports.created = function(req, res, next) {
  if (req.locals.error) {
    return next();
  }

  var entityName = req.params.entity || req.locals.data.entityName;
  var entityService = updateService(entityName, {
    user: req.user
  });

  entityService.created(req.locals.result._id).then(function() {
    next();
  });
};

exports.updated = function(req, res, next) {
  if (req.locals.error || !req.locals.data.shouldCreateUpdate) {
    return next();
  }

  var entityName = req.params.entity || req.locals.data.entityName;
  var entityService = updateService(entityName, {
    user: req.user
  });

  entityService.updated(req.locals.result._id).then(function() {
    next();
  });
};

function MyTasks(req) {
  var deffered = q.defer();

  Task.find({
    assign: req.user._id
  }, function(err, tasks) {
    if (err) {
      deffered.reject(err);
    } else {
      deffered.resolve(tasks.map(function(t) {
        return t._id
      }));
    }
  })
  return deffered.promise

}

exports.getMyTasks = function(req, res, next) {
  if (req.locals.error) {
    return next();
  }
  MyTasks(req).then(function(data) {

    Update.find({
      issue: 'task',
      issueId: {
        $in: data
      }
    }).populate('userObj', 'name lastname').populate({ path: 'issueId', model: Task, select: 'title' }).populate('creator', 'name lastname').exec(function(err, data) {
      if (err) {
        req.locals.error = err;
      } else {
        req.locals.result = data
      }
      next();
    })
  }, function(err) {
    req.locals.error = err;
    next();
  })

}

exports.signNew = function(req, res, next) {
  var entities = {project: 'Project', task: 'Task', discussion: 'Discussion', office: 'Office', folder: 'Folder',officeDocument:"Document", officeDocuments:"Document" ,templateDoc:"TemplateDoc"};
  var query = req.acl.mongoQuery(entities[req.body.data.issue]);
  query.findOne({_id: req.body.data.issueId}).exec(function(err, entity){
    if(err) {
      req.locals.error = err;
    }
    if(!entity) {
      req.locals.error = {
        status: 404,
        message: 'Entity not found'
      };
    }
    if(entity) {
      req.locals.data.watchers = entity.watchers;
      req.locals.data.circles = entity.circles;
    }
    next();
  })
}