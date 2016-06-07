$(function() {
  // Globals
  var user     = 'ckinamistiongedenterattl',
      password = '9047d84b808fe51b65ff94624f80acf8f55fcd63',
      database = 'be7b25ca3682ef8a15682f791c6110648152d7e4',
      remoteDB = new PouchDB('https://' + user + ':' + password + '@djsauble.cloudant.com/' + database),
      localDB = new PouchDB(database);

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

  // Call this once data is loaded into the app
  function init() {
    var Run = Backbone.Model.extend({
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
        }),
        runs = new Runs;

    runs.fetch().then(function() {
      console.log("App is loaded with " + runs.length + " records");
      runs.each(function(r) {
        console.log(r.attributes);
      });
    });
  }
});
