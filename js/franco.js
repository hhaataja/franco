/** 
* @jsx React.DOM 
*/

var WorkoutMain = React.createClass({displayName: 'WorkoutMain',

    loadRawData: function() {

        var rawWorkoutData;
        var workoutDataMapping;

        $.when(getData(this.props.workoutUrl), getData(this.props.workoutMappingUrl))
            .done(function(workoutDataResponse, workoutDataMappingResponse) {

                this.setState({workoutData: workoutDataResponse[0], 
                               workoutDataMapping: workoutDataMappingResponse[0]});

            }.bind(this));

        function getData(url) {
            return $.ajax({
                url: url
            });
        }
    },

    getInitialState: function() {
        return { data: [] };
    },

    componentWillMount: function() {
        this.loadRawData();
    },

    render: function() {

        return (
                React.DOM.div(null, 
                WorkoutLogTable( {data:this.state}),
                WorkoutGraph( {data:this.state})
                )
        );
        
   
    }

});

var WorkoutLogTable = React.createClass({displayName: 'WorkoutLogTable',

    render: function() {

        function transformData(rawEntry, workoutDataMapping) {
            // console.log(workoutDataMapping);
            
            var entryForDate = { date: rawEntry.gsx$date, workouts: [] };

            var workoutMappings = workoutDataMapping.feed.entry;
            for (var i = 0; i < workoutMappings.length; i++) {
                entryForDate.workouts.push({
                    name: workoutMappings[i].gsx$workoutdisplayname.$t,
                    sets: rawEntry[workoutMappings[i].gsx$setcolumn.$t].$t,
                    weight: rawEntry[workoutMappings[i].gsx$weightcolumn.$t].$t,
                    comments: rawEntry[workoutMappings[i].gsx$commentcolumn.$t],
                });

            }

            return entryForDate;
        }

        var workoutRows = [];
        var workoutHeaders = [];

        if (_.has(this.props.data, "workoutData")) {


            var workoutEntries = this.props.data.workoutData.feed.entry.map(function (rawWorkout) {
                return transformData(rawWorkout, this.props.data.workoutDataMapping);

            }.bind(this));

            var key = 0;
            workoutRows = workoutEntries.map(function (entry) {
                return WorkoutRow( {key:key++, entry:entry})
            }); 

            // Grab the headers from the first entry
            workoutHeaders = workoutEntries[0].workouts.map(function (workout) {
                return WorkoutHeader( {name:workout.name})
            });
            
            }




	return (

		React.DOM.div( {className:"workoutLogTable"}, 
		
                React.DOM.div( {className:"page-header"}, 
                React.DOM.h1(null, "Treenit")
                ),
                
                React.DOM.table( {className:"table table-condensed table-bordered table-striped"}, 
                React.DOM.thead(null, 
                React.DOM.tr(null, 
                   React.DOM.th(null, "PVM"),
                workoutHeaders

                )
                ),
                React.DOM.tbody(null, 
                    workoutRows
                )
                )
                )
	);
    }
});

var WorkoutHeader = React.createClass({displayName: 'WorkoutHeader',

    render: function() {
        return React.DOM.th( {colSpan:"2"}, this.props.name)
    }

});

var WorkoutRow = React.createClass({displayName: 'WorkoutRow',

    render: function() {
        
        function createWorkoutColumns(entriesData) {
            
            return entriesData.map(function (entryData) {
                return [
                        React.DOM.td(null, entryData.weight),
                        React.DOM.td(null, WorkoutSetDescription( {sets:entryData.sets}))
                       ];
            });
        }

        var workoutColumns = createWorkoutColumns(this.props.entry.workouts);

        return (
                React.DOM.tr(null, 
                   React.DOM.td(null, this.props.entry.date),
                   workoutColumns
                )

              );
    }
});

var WorkoutSetDescription = React.createClass({displayName: 'WorkoutSetDescription',

    render: function() {

        // TODO: These should be somehow configurable
        var labelTypes = { '0': "label-danger",
                           '1': "label-danger",
                           '2': "label-danger",
                           '3': "label-danger",
                           '4': "label-warning",
                           '5': "label-success"
                         };
        
        var sets = '';

        var defaultLabelType = "label-success";
        
        if (this.props.sets !== '') {
            sets = this.props.sets.split('').map(function(repCount) {
                var labelType = defaultLabelType;
                if (_.has(labelTypes, repCount)) {
                    labelType = labelTypes[repCount];
                }
                var classValue = 'label ' + labelType;

                // parse single digit hex repcounts: support up to 16
                // rep sets
                return React.DOM.span( {className:classValue}, parseInt(repCount,16))
            });
        }

        return (React.DOM.p(null, sets));

    }

});

var WorkoutGraph = React.createClass({displayName: 'WorkoutGraph',

    getExerciseValues: function(rawEntryData, exerciseKey) {
        return _.map(rawEntryData, function(entry) {
            var rawValue = entry[exerciseKey].$t;
            if (rawValue) {
                return parseFloat(entry[exerciseKey].$t.replace(",","."));
            } else {
                return null;
            }
        });
    },

    renderGraph: function(rawEntries, dataMapping) {


        if (!_.isEmpty(rawEntries)) {

            var dates  = _.map(rawEntries, function(entry) {
                return entry.gsx$date.$t;
            });

            
            var workouts = [];
            
            for (var i = 0 ; i < dataMapping.length ; i++) {
                workouts.push(
                    { 
                        name: dataMapping[i].gsx$workoutdisplayname.$t,
                        data: this.getExerciseValues(rawEntries, dataMapping[i].gsx$weightcolumn.$t)
                    });
            }

            var ctx = $(this.getDOMNode()).highcharts({
                chart: {
                    type: 'line'
                },
                title: {
                    text: 'Kehitys'
                },
                xAxis: {
                    categories: dates
                },
                yAxis: {
                    title: {
                        text: 'Sarjapaino (kg)'
                    }
                },
                plotOptions: {
                    series: {
                        connectNulls: true
                    }
                },
                series: workouts
            });
        }
    },

    componentDidMount: function() {

    },

    componentWillReceiveProps: function(nextProps) {
        this.renderGraph(nextProps.data.workoutData.feed.entry, nextProps.data.workoutDataMapping.feed.entry);
    },

    render: function() {
        return (
                React.DOM.div( {id:"graph-div"}
                )
               );
    }
});


var oGetVars = new (function (sSearch) {
  if (sSearch.length > 1) {
    for (var aItKey, nKeyId = 0, aCouples = sSearch.substr(1).split("&"); nKeyId < aCouples.length; nKeyId++) {
      aItKey = aCouples[nKeyId].split("=");
      this[unescape(aItKey[0])] = aItKey.length > 1 ? unescape(aItKey[1]) : "";
    }
  }
})(window.location.search);

// alert(oGetVars.sheet);

var sheetUrlTemplate = "https://spreadsheets.google.com/feeds/list/%KEY%/%SHEET%/public/values?alt=json";

var sheetKey = oGetVars.sheetKey || "0AtPKdBzGwWLwdFFsMHZkSzQ1SnJ3RTdQS0N3c2lrTWc";
var workoutDataSheetId = oGetVars.dataSheetId || "od6";
var dataMappingSheetId = oGetVars.mappingSheetId || "od7";

var workoutDataUrl = sheetUrlTemplate.replace(/%KEY%/, sheetKey);
workoutDataUrl = workoutDataUrl.replace(/%SHEET%/, workoutDataSheetId);

var dataMappingUrl = sheetUrlTemplate.replace(/%KEY%/, sheetKey);
dataMappingUrl = dataMappingUrl.replace(/%SHEET%/, dataMappingSheetId);


React.renderComponent(
        WorkoutMain( {workoutUrl:workoutDataUrl, workoutMappingUrl:dataMappingUrl}),
    document.getElementById('content')
);


var chatRef = new Firebase('https://sweltering-fire-5538.firebaseio.com');
var auth = new FirebaseSimpleLogin(chatRef, function(error, user) {
  if (error) {
    // an error occurred while attempting login
    console.log(error);
  } else if (user) {
    // user authenticated with Firebase
    console.log('User ID: ' + user.id + ', Provider: ' + user.provider);
  } else {
    // user is logged out
  }
});


auth.login('facebook');


