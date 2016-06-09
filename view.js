$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        el: $("#forrest"),

        initialize: function() {
          this.title = this.$("#title");
          this.chart = this.$("#chart");
          this.listenToOnce(Forrest.runs, "processed", this.render);
          this.render();
        },

        render: function() {
          this.title.html(Forrest.runs.length + " runs in the bag");
          this.chart.highcharts({
            chart: {
              type: 'column'
            },
            title: {
              text: 'Runs over time'
            },
            xAxis: {
              type: 'datetime',
              title: {
                text: 'Day'
              }
            },
            yAxis: {
              title: {
                text: 'Distance'
              }
            },
            series: [{
              data: Forrest.runs.map(function(r) {
                var d = r.get('timestamp');
                return [
                  Date.UTC(d.getYear() + 1900, d.getMonth(), d.getDate()),
                  Math.round(r.get('distance') / 1609.3 * 10) / 10
                ];
              })
            }]
          });
          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    view: new View
  });

}(typeof exports === 'undefined' ? window : exports));
