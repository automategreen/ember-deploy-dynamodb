var CoreObject  = require('core-object');
var RSVP        = require('rsvp');
var chalk       = require('chalk');
var Promise     = require('ember-cli/lib/ext/promise');
var SilentError = require('silent-error');

var DEFAULT_MANIFEST_SIZE   = 10;
var DEFAULT_TAGGING_ADAPTER = 'sha';

var green = chalk.green;
var white = chalk.white;

module.exports = CoreObject.extend({
  init: function(options) {
    this._super(options);
    this.manifestSize = this.manifestSize || DEFAULT_MANIFEST_SIZE;
    this.EmberDeployIndex  = require('./EmberDeployIndex')(this.config);
  },

  upload: function(value) {
    var key = this.taggingAdapter.createTag();

    return this._upload(value, key);
  },

  list: function() {
    var that = this;

    return new RSVP.Promise(function(resolve){
      that.EmberDeployIndex.query('manifest').eq(that.manifest).exec()
      .then(function(indexes){
        var current;
        var revisions = indexes
        .map(function (index) {
          var key = index.key;
          if(key === that._currentKey()) {
            current = index.ref;
          }
          return key;
        })
        .filter(function(key) {
          return key !== that._currentKey();
        });

        return {
          revisions: revisions,
          current: current
        };
      })
      .then(function(results) {
        var revisions = results.revisions;
        var current   = results.current;
        var message   = that._revisionListMessage(revisions, current);

        that._printSuccessMessage(message);

        resolve(message);
      });
    });
  },

  activate: function(revisionKey) {
    if (!revisionKey) {
      return this._printErrorMessage(this._noRevisionPassedMessage());
    }
    var that = this;

    return new RSVP.Promise(function(resolve, reject){
      that.EmberDeployIndex
      .get({manifest: that.manifest, key: revisionKey})
      .then(function(revision){
        if(!revision) {
          throw new Error('No index found for revision');
        }

        var current = new that.EmberDeployIndex({
          manifest: that.manifest,
          key: that._currentKey(),
          index: revision.index,
          create: Date.now(),
          ref: revision.key
        });

        return current.save();
      })
      .then(that._activationSuccessfulMessage)
      .then(that._printSuccessMessage.bind(that))
      .catch(function() {
        reject(that._printErrorMessage(that._revisionNotFoundMessage()));
      });
    });
  },

  _upload: function(value, key) {
    return this._uploadIfNotAlreadyInManifest(value, key)
      .then(this._deploySuccessMessage.bind(this, key))
      .then(this._printSuccessMessage.bind(this))
      .then(function() { return key; })
      .catch(function() {
        var message = this._deployErrorMessage();
        return this._printErrorMessage(message);
      }.bind(this));
  },

  _uploadIfNotAlreadyInManifest: function(value, key) {
    var that = this;

    return new RSVP.Promise(function(resolve, reject){
      that.EmberDeployIndex.get({manifest: that.manifest, key: key})
      .then(function(result) {
        if(result) {
          console.log(result);
          throw new Error('Key already exists');
        }
      })
      .then(function() {
        return that.EmberDeployIndex.create({
          manifest: that.manifest,
          key: key,
          index: value
        });
      })
      .then(function() {
        resolve();
      })
      .catch(function() {
        reject();
      });
    });
  },

  _cleanUpManifest: function() {
  },

  _currentKey: function() {
    return this.manifest+':current';
  },

  _printSuccessMessage: function(message) {
    return this.ui.writeLine(message);
  },

  _printErrorMessage: function(message) {
    return Promise.reject(new SilentError(message));
  },

  _deploySuccessMessage: function(revisionKey) {
    var success       = green('\nUpload successful!\n\n');
    var uploadMessage = white('Uploaded revision: ')+green(revisionKey);

    return success + uploadMessage;
  },

  _deployErrorMessage: function() {
    var failure    = '\nUpload failed!\n';
    var suggestion = 'Did you try to upload an already uploaded revision?\n\n';
    var solution   = 'Please run `'+green('ember deploy:list')+'` to ' +
                     'investigate.';

    return failure + '\n' + white(suggestion) + white(solution);
  },

  _noRevisionPassedMessage: function() {
    var err = '\nError! Please pass a revision to `deploy:activate`.\n\n';

    return err + white(this._revisionSuggestion());
  },

  _activationSuccessfulMessage: function() {
    var success = green('\nActivation successful!\n\n');
    var message = white('Please run `'+green('ember deploy:list')+'` to see '+
                        'what revision is current.');

    return success + message;
  },

  _revisionNotFoundMessage: function() {
    var err = '\nError! Passed revision could not be found in manifest!\n\n';

    return err + white(this._revisionSuggestion());
  },

  _revisionSuggestion: function() {
    var suggestion = 'Try to run `'+green('ember deploy:list')+'` '+
                     'and pass a revision listed there to `' +
                     green('ember deploy:activate')+'`.\n\nExample: \n\n'+
                     'ember deploy:activate --revision <manifest>:<sha>';

    return suggestion;
  },

  _revisionListMessage: function(revisions, currentRevision) {
    var manifestSize  = this.manifestSize;
    var headline      = '\nLast '+ manifestSize + ' uploaded revisions:\n\n';
    var footer        = '\n\n# => - current revision';
    var revisionsList = revisions.reduce(function(prev, curr) {
      var prefix = (curr === currentRevision) ? '| => ' : '|    ';
      return prev + prefix + chalk.green(curr) + '\n';
    }, '');

    return headline + revisionsList + footer;
  }
});
