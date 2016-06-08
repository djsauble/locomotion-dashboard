(function(exports) {
  var ns = "Forrest",
      Run = Backbone.Model.extend({
        defaults: function() {
          return {
            _id: null,
            _rev: null,
            timestamp: null,
            created_by: null,
            distance: null
          }
        }
      }),
      Runs = Backbone.Collection.extend({
        model: Run,
        pouch: {
          options: {
            query: {
              include_docs: true,
              fun: {
                map: function(doc, emit) {
                  emit(doc.timestamp, null);
                }
              }
            }
          }
        },
        parse: function(result) {
          return _.pluck(result.rows, 'doc').map(function(d) {
            d.timestamp = new Date(d.timestamp);
            return d;
          });
        },
        save: function(options) {
          return Backbone.sync('create', this, options);
        },
        process: function() {
          var me = this,
              missingDistance = [],
              done = new Promise(function(resolve) {
                me.each(function(r) {
                  if (!r.get('distance')) {
                    missingDistance.push({
                      id: r.get('_id'),
                      rev: r.get('_rev')
                    });
                  }
                });

                if (missingDistance.length > 0) {
                  localDB.bulkGet({docs: missingDistance, attachments: true}).then(function(results) {
                    var docs = results.results.map(function(r) {
                      return r.docs[0].ok;
                    });
                    docs.forEach(function(d) {
                      var data = getRun(d),
                          filtered = defaultFilter(data),
                          coords = getCoordinates(filtered),
                          model = me.get(d._id);

                      model.save('distance', computeDistance(coords));
                    });
                    localDB.replicate.to(remoteDB).on('complete', function() {
                      resolve(missingDistance.length);
                    });
                  });
                }
                else {
                  resolve(0);
                }
              });

          done.then(function(count) {
            me.trigger("processed", me, count);
          });
        }
      });

  // Export run collection to the namespace
  exports[ns] = _.extend(exports[ns] || {}, {
    runs: new Runs,
    init: init
  });

  // Call this once data is loaded into the app
  function init(options) {
    var runs = exports[ns].runs,
        remoteDB = new PouchDB(options.host + '/' + options.db),
        localDB = new PouchDB(options.db);

    // Rework the default syncing behavior for compatibility with PouchDB 
    Backbone.sync = BackbonePouch.sync({
      db: localDB,
      fetch: 'query',
      options: {
        query: {
          include_docs: true
        }
      }
    });
    Backbone.Model.prototype.idAttribute = '_id';

    localDB.allDocs().then(function(results) {
      // Populate the local database with data if empty
      if (results.total_rows == 0) {
        return PouchDB.replicate(remoteDB, localDB);
      }
      return new Promise(function(resolve) { resolve(); });
    }).then(function() {
      // Fetch and parse data from PouchDB
      return runs.fetch();
    }).then(function() {
      // Perform any necessary post-processing
      runs.process();
    });
  }
}(typeof exports === 'undefined' ? window : exports));
