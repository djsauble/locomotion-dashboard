$(function(exports) {
  // Globals
  //var user     = 'ckinamistiongedenterattl';
  //var password = '9047d84b808fe51b65ff94624f80acf8f55fcd63';
  var ns = "Forrest",
      database = 'be7b25ca3682ef8a15682f791c6110648152d7e4',
      remoteDB = new PouchDB('http://127.0.0.1:5984/' + database),
      localDB = new PouchDB(database),
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
        }
      });

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

  // Populate the local database with data if empty
  localDB.allDocs().then(function(results) {
    if (results.total_rows == 0) {
      return PouchDB.replicate(remoteDB, localDB);
    }
    return new Promise(function(resolve) { resolve(); });
  }).then(function() {
    init();
  });

  // Export api to the namespace
  exports[ns] = {
    Run: Run,
    Runs: Runs,
    db: localDB,
    runs: null // This will be instantiated once the data has loaded
  }

  // Call this once data is loaded into the app
  function init() {
    runs = new Runs;

    runs.fetch().then(function() {
      console.log("App is loaded with " + runs.length + " records");
      var missingDistance = [];
      runs.each(function(r) {
        if (!r.get('distance')) {
          console.log("Missing distance! " + r.get('timestamp'));
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
                model = runs.get(d._id);

            model.set('distance', computeDistance(coords));
            model.save();
          });
          localDB.replicate.to(remoteDB).on('complete', function() {
            console.log("Yay, we're done!");
          }).on('error', function(err) {
            console.log(err);
          });
        });
      }

      // Export run collection to the namespace
      exports[ns].runs = runs;
    });
  }
}(typeof exports === 'undefined' ? window : exports));
