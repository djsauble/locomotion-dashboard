$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        el: $("#forrest"),

        initialize: function() {
          this.title = this.$("#title");
          this.listenToOnce(Forrest.runs, "processed", this.render);
          this.render();
        },

        render: function() {
          this.title.html(Forrest.runs.length + " runs in the bag");
          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    view: new View
  });

}(typeof exports === 'undefined' ? window : exports));
