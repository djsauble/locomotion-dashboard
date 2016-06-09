$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        el: $("#forrest"),

        initialize: function() {
          this.loading = this.$("#loading");
          this.run_count = this.$("#run_count");
          this.total_mileage = this.$("#total_mileage");
          this.last_30_days = this.$("#last_30_days");
          this.trend = this.$("#trend");
          this.last_run = this.$("#last_run");
          this.chart = this.$("#chart");
          this.listenToOnce(Forrest.runs, "processed", this.render);
        },

        render: function() {
          var str,
              distance = 0,
              thirtyDaysAgo = new Date(new Date() - (1000*60*60*24*30)),
              weekInMs = 1000 * 60 * 60 * 24 * 7,
              last30days = Forrest.runs.filter(function(e) {
                if (e.get('timestamp') >= thirtyDaysAgo) {
                  return e;
                }
              });

          // Zero the thirty days ago timestamp to midnight
          thirtyDaysAgo.setHours(0);
          thirtyDaysAgo.setMinutes(0);
          thirtyDaysAgo.setSeconds(0);
          thirtyDaysAgo.setMilliseconds(0);

          // Hide the loading indicator
          this.loading.hide();

          // Show the total number of runs
          str = Forrest.runs.length + " runs";
          this.run_count.html(str);

          // Show the total distance traversed
          distance = 0;
          Forrest.runs.each(function(r) {
            distance += r.getMileage()
          });
          str = (Math.round(distance*10) / 10) + " miles";
          this.total_mileage.html(str);

          // Show the total distance traversed in the last 30 days
          distance = 0;
          _.each(last30days, function(r) {
            distance += r.getMileage();
          });
          str = (Math.round(distance*10) / 10) + " miles";
          this.last_30_days.html(str);

          // Show the distance traversed on your last run
          distance = Forrest.runs.at(Forrest.runs.length - 1).getMileage();
          str = distance + " miles";
          this.last_run.html(str);

          // Calculate the linear regression of the last 30 days
          this.trend.html(Math.round(regression('linear', last30days.map(function(r) {
              return [r.get('timestamp').getTime() / weekInMs, r.getMileage()];
            })
          ).equation[0] * 100) + "% WoW increase");

          // Show the chart of the last 30 days of running history
          this.chart.highcharts({
            chart: {
              type: 'column'
            },
            title: {
              text: null
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
                  r.getMileage()
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
