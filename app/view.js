$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        el: $("#forrest"),

        initialize: function() {
          this.miles_this_week = this.$("#this_week .miles");
          this.trend_this_week = this.$("#this_week .trend");
          this.goal_this_week = this.$("#this_week .goal");
          this.miles_this_month = this.$("#this_month .miles");
          this.trend_this_month = this.$("#this_month .trend");
          this.goal_this_month = this.$("#this_month .goal");
          this.chart = this.$("#chart");

          this.listenToOnce(Forrest.runs, "processed", this.render);
        },

        render: function() {
          var dayInMs = 1000 * 60 * 60 * 24,
              weekInMs = dayInMs * 7,
              now = new Date(),
              startOfToday,
              startOfThisWeek,
              startOfLastWeek, 
              startOfThisMonth,
              startOfLastMonth,
              runsThisWeek = [],
              runsLastWeek = [],
              runsThisMonth = [],
              runsLastMonth = [];
              distanceThisWeek = 0,
              distanceLastWeek = 0,
              distanceThisMonth = 0,
              distanceLastMonth = 0,
              percentChangeWoW = 0,
              percentChangeMoM = 0,
              remainingGoalThisWeek = 0,
              remainingGoalThisMonth = 0;

          // Start of today (normalized to midnight)
          today = new Date(now);
          today.setHours(0);
          today.setMinutes(0);
          today.setSeconds(0);
          today.setMilliseconds(0);

          // Start of this week (normalized to midnight)
          startOfThisWeek = new Date(today - (dayInMs * today.getDay()));

          // Start of last week
          startOfLastWeek = new Date(startOfThisWeek - weekInMs);

          // Start of this month
          startOfThisMonth = new Date(today);
          startOfThisMonth.setDate(1);

          // Start of last month
          startOfLastMonth = new Date(startOfThisMonth);
          startOfLastMonth.setMonth(startOfThisMonth.getMonth() - 1);
          
          // Compile data for different time ranges
          Forrest.runs.each(function(e) {
            var t = e.get('timestamp');

            // This week
            if (t >= startOfThisWeek) {
              runsThisWeek.push(e);
              distanceThisWeek += e.getMileage();
            }

            // Last week
            if (t >= startOfLastWeek && t < startOfThisWeek) {
              runsLastWeek.push(e);
              distanceLastWeek += e.getMileage();
            }

            // This month
            if (t >= startOfThisMonth) {
              runsThisMonth.push(e);
              distanceThisMonth += e.getMileage();
            }

            // Last month
            if (t >= startOfLastMonth && t < startOfThisMonth) {
              runsLastMonth.push(e);
              distanceLastMonth += e.getMileage();
            }
          });

          // Normalize distances to single decimal precision
          distanceThisWeek = Math.round(distanceThisWeek * 10) / 10;
          distanceLastWeek = Math.round(distanceLastWeek * 10) / 10;
          distanceThisMonth = Math.round(distanceThisMonth * 10) / 10;
          distanceLastMonth = Math.round(distanceLastMonth * 10) / 10;

          // Calculate trending data
          percentChangeWoW = Math.round(
            ((distanceThisWeek / distanceLastWeek) - 1) * 100
          );
          percentChangeMoM = Math.round(
            ((distanceThisMonth / distanceLastMonth) - 1) * 100
          );

          // Calculate goals
          remainingGoalThisWeek =
            Math.round(10 * ((1.1 * distanceLastWeek) - distanceThisWeek)) / 10;
          remainingGoalThisMonth =
            Math.round(10 * ((1.1 * distanceLastMonth) - distanceThisMonth)) / 10;

          // Display distance data
          this.miles_this_week.html(distanceThisWeek + " miles");
          this.miles_this_month.html(distanceThisMonth + " miles");

          // Display trending data
          this.trend_this_week.html(percentChangeWoW + "% WoW");
          this.trend_this_month.html(percentChangeMoM + "% MoM");

          // Display goal data for the week
          if (remainingGoalThisWeek > 0) {
            this.goal_this_week.html(remainingGoalThisWeek + " miles to go");
          }
          else {
            this.goal_this_week.html("Met goal!");
          }

          // Display goal data for the month
          if (remainingGoalThisMonth > 0) {
            this.goal_this_month.html(remainingGoalThisMonth + " miles to go");
          }
          else {
            this.goal_this_month.html("Met goal!");
          }

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
