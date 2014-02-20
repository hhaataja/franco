/** 
* @jsx React.DOM 
*/

var WorkoutMain = React.createClass({

    __firebaseBaseUrl: 'https://sweltering-fire-5538.firebaseio.com',

    loadRawData: function(user) {
        console.log("Let's load data for user " + user.uid);
    
        var sheetUrlTemplate = "https://spreadsheets.google.com/feeds/list/%KEY%/%SHEET%/public/values?alt=json";


    
        var firebaseRef = new Firebase(this.__firebaseBaseUrl + "/users/" + user.uid);
        
        firebaseRef.once('value', function(dataSnapshot) {
            
            // TODO: to own function
            if (dataSnapshot.hasChild('docKey') && 
                dataSnapshot.hasChild('dataSheetId') && 
                dataSnapshot.hasChild('mappingSheetId')) {

                var docKey = dataSnapshot.child('docKey').val();
                var dataSheetId = dataSnapshot.child('dataSheetId').val();
                var mappingSheetId = dataSnapshot.child('mappingSheetId').val();

                var workoutDataUrl = sheetUrlTemplate.replace(/%KEY%/, docKey);
                workoutDataUrl = workoutDataUrl.replace(/%SHEET%/, dataSheetId);
                
                var dataMappingUrl = sheetUrlTemplate.replace(/%KEY%/, docKey);
                dataMappingUrl = dataMappingUrl.replace(/%SHEET%/, mappingSheetId);

                $.when(getData(workoutDataUrl), getData(dataMappingUrl))
                    .done(function(workoutDataResponse, workoutDataMappingResponse) {

                        this.setState({workoutData: workoutDataResponse[0], 
                                       workoutDataMapping: workoutDataMappingResponse[0]});
                        
                    }.bind(this));

                function getData(url) {
                    return $.ajax({
                        url: url
                    });
                }

            } else {
                alert("No docKey nor sheet ids found");
            }

        }.bind(this));
        

    },

    getInitialState: function() {
        return { data: [], loggedIn: false };
    },

    componentWillMount: function() {
        var chatRef = new Firebase('https://sweltering-fire-5538.firebaseio.com');
        var auth = new FirebaseSimpleLogin(chatRef, function(error, user) {
            if (error) {
                // an error occurred while attempting login
                console.log(error);
            } else if (user) {
                // user authenticated with Firebase
                console.log('User ID: ' + user.id + ', Provider: ' + user.provider);
                this.setState({loggedIn:true, user: user});
                this.loadRawData(user);
            } else {
                this.setState({loggedIn:false});
            }
        }.bind(this));
        
        this.setState({chatRef: chatRef, auth: auth});
    },

    render: function() {

        return (
                <div>
                <a href="#" onClick={this.logout}>Logout</a>
                <LoginView visible={!this.state.loggedIn} auth={this.state.auth} user={this.state.user}/>
                <WorkoutLogTable visible={this.state.loggedIn} data={this.state}/>
                <WorkoutGraph visible={this.state.loggedIn} data={this.state}/>
                </div>
        );
    },

    logout: function() {
        this.state.auth.logout();
    }

    

});

var LoginView = React.createClass({

    render: function() {

        if (this.props.visible) {

            return (<h1>Plz login <a href="#" onClick={this.fbLogin}>FB</a></h1>)
            
        } else {
            return (<h1>Moi {this.props.user.displayName}</h1>)
        }
    },


    fbLogin: function() {
        this.props.auth.login('facebook');
    }

});

var WorkoutLogTable = React.createClass({

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

        if (this.props.visible) {

        var workoutRows = [];
        var workoutHeaders = [];

        if (_.has(this.props.data, "workoutData")) {


            var workoutEntries = this.props.data.workoutData.feed.entry.map(function (rawWorkout) {
                return transformData(rawWorkout, this.props.data.workoutDataMapping);

            }.bind(this));

            var key = 0;
            workoutRows = workoutEntries.map(function (entry) {
                return <WorkoutRow key={key++} entry={entry}/>
            }); 

            // Grab the headers from the first entry
            workoutHeaders = workoutEntries[0].workouts.map(function (workout) {
                return <WorkoutHeader name={workout.name}/>
            });
            
            }




	return (

		<div className="workoutLogTable">
		
                <div className="page-header">
                <h1>Treenit</h1>
                </div>
                
                <table className="table table-condensed table-bordered table-striped">
                <thead>
                <tr>
                   <th>PVM</th>
                {workoutHeaders}

                </tr>
                </thead>
                <tbody>
                    {workoutRows}
                </tbody>
                </table>
                </div>
	);

            } else {
                return <div></div>;
            }
    }
});

var WorkoutHeader = React.createClass({

    render: function() {
        return <th colSpan="2">{this.props.name}</th>
    }

});

var WorkoutRow = React.createClass({

    render: function() {
        
        function createWorkoutColumns(entriesData) {
            
            return entriesData.map(function (entryData) {
                return [
                        <td>{entryData.weight}</td>,
                        <td><WorkoutSetDescription sets={entryData.sets}/></td>
                       ];
            });
        }

        var workoutColumns = createWorkoutColumns(this.props.entry.workouts);

        return (
                <tr>
                   <td>{this.props.entry.date}</td>
                   {workoutColumns}
                </tr>

              );
    }
});

var WorkoutSetDescription = React.createClass({

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
                return <span className={classValue}>{parseInt(repCount,16)}</span>
            });
        }

        return (<p>{sets}</p>);

    }

});

var WorkoutGraph = React.createClass({

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

    __destroyGraph: function() {
        var chart = $(this.getDOMNode()).highcharts(); 
        if (chart) { chart.destroy(); }
    },

    componentDidMount: function() {

    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.visible && nextProps.data.workoutData) {
            this.renderGraph(nextProps.data.workoutData.feed.entry, nextProps.data.workoutDataMapping.feed.entry);
        } else {
            console.log("Destroying graph");
            this.__destroyGraph();
        }
    },

    render: function() {
        if (this.props.visible) {
            return (
                    <div id="graph-div">
                    </div>
            );
        } else {
            return <div></div>
        }
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



React.renderComponent(
        <WorkoutMain/>,
    document.getElementById('content')
);





