$(function(exports) {
  var ns = "Forrest",
      View = Backbone.View.extend({
        el: $("#forrest"),

        initialize: function() {
          this.miles_this_week = this.$("#this_week .miles");
          this.trend_this_week = this.$("#this_week .trend");
          this.goal_this_week = this.$("#this_week .goal");
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
              runsByWeek = [],
              runsThisWeek = [],
              runsLastWeek = [],
              distanceThisWeek = 0,
              distanceLastWeek = 0,
              percentChange = 0,
              remainingGoalThisWeek = 0,
              actualTrendLine,
              desiredTrendLine,
              seriesData,
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
          });

          // Normalize distances to single decimal precision
          distanceThisWeek = Math.round(distanceThisWeek * 10) / 10;
          distanceLastWeek = Math.round(distanceLastWeek * 10) / 10;

          // Calculate trending data
          percentChange = Math.round(
            ((distanceThisWeek / distanceLastWeek) - 1) * 100
          );

          // Calculate goals
          remainingGoalThisWeek = Math.round(10 * ((1.1 * distanceLastWeek) - distanceThisWeek)) / 10;

          // Display distance data
          this.miles_this_week.html(distanceThisWeek + " miles this week");

          // Display trending data
          if (percentChange > 0) {
            this.trend_this_week.html(percentChange + "% more than last week");
          }
          else if (percentChange < 0) {
            this.trend_this_week.html(Math.abs(percentChange) + "% less than last week");
          }
          else {
            this.trend_this_week.html("Same mileage as last week.");
          }

          // Display goal data for the week
          if (remainingGoalThisWeek > 0) {
            this.goal_this_week.html(remainingGoalThisWeek + " miles to go (" + (Math.round(remainingGoalThisWeek / (7 - startOfToday.getDay()) * 10) / 10) + " mi/day)");
          }
          else {
            this.goal_this_week.html("Met goal!");
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
            distance: 0,
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
                distance: 0,
                days: [0, 0, 0, 0, 0, 0, 0]
              };
            }

            obj.days[t.getDay()] += run.getMileage()
            obj.distance += run.getMileage();
          }
          runsByWeek.push(obj);

          // Calculate trend lines
          var i = 0;
          actualTrendLine = regression('linear', runsByWeek.map(function(w) {
            return [i++, w.distance];
          }));
          desiredTrendLine = [runsByWeek[0].distance];
          for (var i = 1; i < runsByWeek.length; ++i) {
            desiredTrendLine.push(desiredTrendLine[i - 1] * 1.1);
          }

          // Calculate series data
          seriesData = weekdayNameMapping.map(function(d) {
            return {
              name: d[1],
              color: d[2],
              stacking: 'normal',
              data: runsByWeek.map(function(w) {
                return [
                  monthNameMapping[w.weekOf.getMonth()] + ' ' + w.weekOf.getDate(),
                  w.days[d[0]]
                ];
              })
            };
          });
          seriesData.push({
            name: 'Actual trend',
            type: 'line',
            color: '#00FF00',
            data: runsByWeek.map(function(w) {
              return [
                monthNameMapping[w.weekOf.getMonth()] + ' ' + w.weekOf.getDate(),
                actualTrendLine.points.shift()[1]
              ];
            })
          });
          seriesData.push({
            name: 'Desired trend',
            type: 'line',
            color: '#FF0000',
            data: runsByWeek.map(function(w) {
              return [
                monthNameMapping[w.weekOf.getMonth()] + ' ' + w.weekOf.getDate(),
                desiredTrendLine.shift()
              ];
            })
          });

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
            series: seriesData
          });
          return this;
        }
      });

  exports[ns] = _.extend(exports[ns] || {}, {
    view: new View
  });

}(typeof exports === 'undefined' ? window : exports));
