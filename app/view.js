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
              startOfFirstDay,
              startOfFirstWeek,
              weekIterator,
              nextWeekIterator,
              startOfToday,
              startOfThisWeek,
              startOfLastWeek, 
              startOfThisMonth,
              startOfLastMonth,
              runsByWeek = [],
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
              remainingGoalThisMonth = 0,
              weekdayNameMapping = [
                [0, 'Sunday', '#990033'],
                [1, 'Monday', '#000051'],
                [2, 'Tuesday', '#99006F'],
                [3, 'Wednesday', '#00008D'],
                [4, 'Thursday', '#9900AB'],
                [5, 'Friday', '#0000C9'],
                [6, 'Saturday', '#9900E7']
              ],
              monthNameMapping = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec'
              ];

          // Start of today (normalized to midnight)
          startOfToday = new Date(now);
          startOfToday.setHours(0);
          startOfToday.setMinutes(0);
          startOfToday.setSeconds(0);
          startOfToday.setMilliseconds(0);

          // Start of this week (normalized to midnight)
          startOfThisWeek = new Date(startOfToday - (dayInMs * startOfToday.getDay()));

          // Start of last week
          startOfLastWeek = new Date(startOfThisWeek - weekInMs);

          // Start of this month
          startOfThisMonth = new Date(startOfToday);
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

          // Start of first day in the database
          startOfFirstDay = new Date(Forrest.runs.at(0).get('timestamp'));
          startOfFirstDay.setHours(0);
          startOfFirstDay.setMinutes(0);
          startOfFirstDay.setSeconds(0);
          startOfFirstDay.setMilliseconds(0);

          // Start of first week in the database
          startOfFirstWeek = new Date(startOfFirstDay - (dayInMs * startOfFirstDay.getDay()));

          // Compile weekly run data
          weekIterator = new Date(startOfFirstWeek);
          nextWeekIterator = new Date(weekIterator.getTime() + weekInMs);
          var obj = {
            weekOf: weekIterator,
            days: [0, 0, 0, 0, 0, 0, 0]
          };
          for (var i = 0; i < Forrest.runs.length; ++i) {
            var run = Forrest.runs.at(i),
                t = run.get('timestamp');

            while (t >= nextWeekIterator) {
              weekIterator = new Date(nextWeekIterator);
              nextWeekIterator = new Date(weekIterator.getTime() + weekInMs);
              runsByWeek.push(obj);
              obj = {
                weekOf: weekIterator,
                days: [0, 0, 0, 0, 0, 0, 0]
              };
            }

            obj.days[t.getDay()] += run.getMileage()
          }
          runsByWeek.push(obj);

          // Show the chart of weekly running history, stacked by weekday
          this.chart.highcharts({
            chart: {
              type: 'column'
            },
            title: {
              text: null
            },
            xAxis: {
              type: 'category'
            },
            yAxis: {
              title: {
                text: 'Distance'
              }
            },
            plotOptions: {
              series: {
                stacking: 'normal'
              }
            },
            series: weekdayNameMapping.map(function(d) {
              return {
                name: d[1],
                color: d[2],
                data: runsByWeek.map(function(w) {
                  return [
                    monthNameMapping[w.weekOf.getMonth()] + ' ' + w.weekOf.getDate(),
                    w.days[d[0]]
                  ];
                })
              };
            })
          });
          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    view: new View
  });

}(typeof exports === 'undefined' ? window : exports));
