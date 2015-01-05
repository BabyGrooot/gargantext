// Pre-defined constants
var operators = {
    'text': [
        {'label': 'contains',       'key': 'contains'}
    ],
    'string': [
        {'label': 'starts with',    'key': 'startswith'},
        {'label': 'contains',       'key': 'contains'},
        {'label': 'ends with',      'key': 'endswith'},
        {'label': 'is',             'key': '='},
        {'label': 'is before',      'key': '<'},
        {'label': 'is after',       'key': '>'}
    ],
    'integer': [
        {'label': 'is',             'key': '='},
        {'label': 'is lower than',  'key': '<'},
        {'label': 'is higher than', 'key': '>'}
    ],
    'float': [
        {'label': 'is',             'key': '='},
        {'label': 'is lower than',  'key': '<'},
        {'label': 'is higher than', 'key': '>'}
    ],
    'datetime': [
        {'label': 'is',             'key': '='},
        {'label': 'is before',      'key': '<'},
        {'label': 'is after',       'key': '>'}
    ],
};

var strDate = function(date) {
    return date.getUTCFullYear() + '-' +
            ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
            ('00' + date.getUTCDate()).slice(-2) + 'T' +
            ('00' + date.getUTCHours()).slice(-2) + ':' +
            ('00' + date.getUTCMinutes()).slice(-2) + ':' +
            ('00' + date.getUTCSeconds()).slice(-2) + 'Z';
}
var addZero = function(x) {
    return (x<10) ? ('0'+x) : x;
};
var addZeros = function(x, n) {
    x = x.toString();
    return '0000'.substr(0, n - x.length) + x;
};
var groupings = {
    datetime: {
        century: {
            truncate: function(x) {return x.substr(0, 2) + '00-01-01T00:00:00Z';},
            next: function(x) {x = new Date(x); x.setFullYear(x.getFullYear()+100); return strDate(x);},
        },
        decade: {
            truncate: function(x) {return x.substr(0, 3) + '0-01-01T00:00:00Z';},
            next: function(x) {x = new Date(x); x.setFullYear(x.getFullYear()+10); return strDate(x);},
        },
        year: {
            truncate: function(x) {return x.substr(0, 4) + '-01-01T00:00:00Z';},
            next: function(x) {
                var y = parseInt(x.substr(0, 4));
                return addZeros(y + 1, 4) + x.substr(4);
            },
        },
        month: {
            truncate: function(x) {return x.substr(0, 7) + '-01T00:00:00Z';},
            next: function(x) {
                var m = parseInt(x.substr(5, 2));
                if (m == 12) {
                    var y = parseInt(x.substr(0, 4));
                    return addZeros(y + 1, 4) + '-01' + x.substr(7);
                } else {
                    return x.substr(0, 5) + addZero(m + 1) + x.substr(7);
                }
            },
        },
        day: {
            truncate: function(x) {return x.substr(0, 10) + 'T00:00:00Z';},
            next: function(x) {x = new Date(x); x.setDate(x.getDate()+1); return strDate(x);},
        },
    },
    numeric: {
        unit: {
            truncate: function(x) {return Math.round(x)},
            next: function(x) {return x+1;},
        },
    },
};


// application definition
var gargantext = angular.module('Gargantext', ['n3-charts.linechart']);

// tuning the application's scope
angular.module('Gargantext').run(['$rootScope', function($rootScope){
    $rootScope.Math = Math;
    $rootScope.getColor = function(i, n){
        var h = .3 + (i / n) % 1;
        var s = .7;
        var v = .8;
        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);
        var r, g, b;
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        r = Math.round(255 * r);
        g = Math.round(255 * g);
        b = Math.round(255 * b);
        var color = 'rgb(' + r + ',' + g + ',' + b + ')';
        return color;
    };
    $rootScope.range = function(min, max, step){
        if (max == undefined){
            max = min;
            min = 0;
        }
        step = step || 1;
        var output = [];
        for (var i=min; i<max; i+=step){
            output.push(i);
        }
        return output;
    };
}]);


gargantext.controller("QueryController", function($scope, $http) {
    // query-specific information
    $scope.filters = [];
    $scope.pagination = {offset:0, limit: 20};
    // results information
    $scope.loading = false;
    $scope.results = [];
    $scope.resultsCount = undefined;
    // corpus retrieval
    $scope.corpora = [];
    $.get('/api/nodes?type=Corpus').success(function(response){
        $scope.corpora = response.data;
        $scope.$apply();
    });
    // filtering informations retrieval
    $scope.operators = operators;
    // add a filter
    $scope.addFilter = function() {
        $scope.filters.push({});
    };
    // remove a filter
    $scope.removeFilter = function(filterIndex) {
        $scope.filters.splice(filterIndex, 1);
    };
    // perform a query
    $scope.postQuery = function() {
        if ($scope.corpusId) {
            // change view to loading mode
            $scope.loading = true;
            // query parameters: columns
            var retrieve = {type: 'fields', list: ['id', 'name']};
            // query parameters: pagination
            var pagination = $scope.pagination;
            // query parameters: sort
            var sort = ['name'];
            // query parameters: filters
            var filters = [];
            var keys = ['entity', 'column', 'operator', 'value'];
            for (var i=0, m=$scope.filters.length; i<m; i++) {
                var filter = $scope.filters[i];
                for (var j=0, n=keys.length; j<n; j++) {
                    if (!filter[keys[j]]) {
                        continue;
                    }
                }
                filters.push({
                    field: filter.entity + '.' + filter.column,
                    operator: filter.operator,
                    value: filter.value
                });
            }
            // query URL & body building
            var url = '/api/nodes/' + $scope.corpusId + '/children/queries';
            var query = {
                retrieve: retrieve,
                filters: filters,
                sort: sort,
                pagination: pagination
            };
            // send query to the server
            $http.post(url, query).success(function(response){
                $scope.resultsCount = response.pagination.total;
                $scope.results = response.data;
                $scope.loading = false;
            }).error(function(response){
                console.error(response);
            });
        }
    }
});


gargantext.controller("DatasetController", function($scope, $http) {
    // query-specific information
    $scope.mesured = 'nodes.count';
    $scope.filters = [];
    $scope.pagination = {offset:0, limit: 20};
    // results information
    $scope.loading = false;
    $scope.results = [];
    $scope.resultsCount = undefined;
    // corpus retrieval
    $scope.corpora = [];
    $http.get('/api/nodes?type=Corpus', {cache: true}).success(function(response){
        $scope.corpora = response.data;
    });
    // update entities depending on the selected corpus
    $scope.updateEntities = function() {
        var url = '/api/nodes/' + $scope.corpusId + '/children/metadata';
        $scope.entities = undefined;
        $scope.filters = [];
        $http.get(url, {cache: true}).success(function(response){
            $scope.entities = {
                metadata: response.data,
                ngrams: [
                    {key:'terms', type:'string'},
                    {key:'terms count', type:'integer'}
                ]
            };
        });
        $scope.updateQuery();
    };
    // filtering informations retrieval
    $scope.operators = operators;
    // add a filter
    $scope.addFilter = function() {
        $scope.filters.push({});
    };
    // remove a filter
    $scope.removeFilter = function(filterIndex) {
        $scope.filters.splice(filterIndex, 1);
        $scope.updateQuery();
    };
    // transmit query parameters to parent elements
    $scope.updateQuery = function() {
        if ($scope.corpusId) {
            // query parameters: sort
            var url = '/api/nodes/' + $scope.corpusId + '/children/queries';
            // filters
            var filters = [];
            var keys = ['entity', 'column', 'operator', 'value'];
            for (var i=0, m=$scope.filters.length; i<m; i++) {
                var filter = $scope.filters[i];
                for (var j=0, n=keys.length; j<n; j++) {
                    if (!filter[keys[j]]) {
                        continue;
                    }
                }
                filters.push({
                    field: filter.entity + '.' + filter.column,
                    operator: filter.operator,
                    value: filter.value
                });
            }
            // event firing to parent(s)
            $scope.$emit('updateDataset', {
                datasetIndex: $scope.$index,
                url: url,
                filters: filters,
                mesured: $scope.mesured
            });
        }
    }
});


gargantext.controller("GraphController", function($scope, $http, $element) {
    // initialization
    $scope.datasets = [{}];
    $scope.groupingKey = 'year';
    $scope.options = {
        stacking: false
    };
    $scope.seriesOptions = {
        thicknessNumber: 3,
        thickness: '3px',
        type: 'area',
        striped: false
    };
    $scope.graph = {
        data: [],
        options: {
            axes: {
                x: {key: 'x', type: 'date'},
                y: {type: 'log'},
            },
            tension: 1.0,
            lineMode: 'bundle',
            tooltip: {mode: 'scrubber', formatter: function(x, y, series) {return x + ' → ' + y;}},
            drawLegend: false,
            drawDots: true,
            columnsHGap: 5
        }
    };
    // add a dataset
    $scope.addDataset = function() {
        $scope.datasets.push({});
    };
    // remove a dataset
    $scope.removeDataset = function(datasetIndex) {
        $scope.datasets.shift(datasetIndex);
        $scope.query();
    };
    // show results on the graph
    $scope.showResults = function() {
        // Format specifications
        var grouping = groupings.datetime[$scope.groupingKey];
        var convert = function(x) {return new Date(x);};
        // Find extrema for X
        var xMin, xMax;
        angular.forEach($scope.datasets, function(dataset){
            if (!dataset.results) {
                return false;
            }
            var results = dataset.results;
            var xMinTmp = results[0][0];
            var xMaxTmp = results[results.length - 1][0];
            if (xMin === undefined || xMinTmp < xMin) {
                xMin = xMinTmp;
            }
            if (xMax === undefined || xMaxTmp < xMax) {
                xMax = xMaxTmp;
            }
        });
        // Create the dataObject for interpolation
        var dataObject = {};
        xMin = grouping.truncate(xMin);
        xMax = grouping.truncate(xMax);
        for (var x=xMin; x<=xMax; x=grouping.next(x)) {
            var row = [];
            angular.forEach($scope.datasets, function(){
                row.push(0);
            });
            dataObject[x] = row;
        }
        // Fill the dataObject with results
        angular.forEach($scope.datasets, function(dataset, datasetIndex){
            var results = dataset.results;
            angular.forEach(results, function(result, r){
                var x = grouping.truncate(result[0]);
                var y = result[1];
                dataObject[x][datasetIndex] += parseFloat(y);
            });
        });
        // Convert this object back to a sorted array
        var linearData = [];
        for (var x in dataObject) {
            var row = {x: convert(x)};
            var yList = dataObject[x];
            for (var i=0; i<yList.length; i++) {
                row['y' + i] = yList[i];
            }
            linearData.push(row);
        }
        // Finally, update the graph
        var series = [];
        for (var i=0, n=$scope.datasets.length; i<n; i++) {
            var seriesElement = {
                id: 'series_'+ i,
                y: 'y'+ i,
                axis: 'y',
                color: $scope.getColor(i, n)
            };
            angular.forEach($scope.seriesOptions, function(value, key) {
                seriesElement[key] = value;
            });
            series.push(seriesElement);
        }
        $scope.graph.options.series = series;
        $scope.graph.data = linearData;
        // shall we stack?
        if ($scope.options.stacking) {
            var stack = {
                axis: 'y',
                series: []
            };
            angular.forEach(series, function(seriesElement) {
                stack.series.push(seriesElement.id);
            });
            $scope.graph.options.stacks = [stack];
        } else {
            delete $scope.graph.options.stacks;
        }
    };
    // perform a query on the server
    $scope.query = function() {
        // number of requests made to the server
        var requestsCount = 0;
        // reinitialize graph data
        $scope.graph.data = [];
        // queue all the server requests
        angular.forEach($scope.datasets, function(dataset, datasetIndex) {
            // if the results are already present, don't send a query
            if (dataset.results !== undefined) {
                return;
            }
            // format data to be sent as a query
            var query = dataset.query;
            var data = {
                filters: query.filters,
                sort: ['metadata.publication_date.day'],
                retrieve: {
                    type: 'aggregates',
                    list: ['metadata.publication_date.day', query.mesured]
                }
            };
            // request to the server
            $http.post(query.url, data, {cache: true}).success(function(response) {
                dataset.results = response.results;
                for (var i=0, n=$scope.datasets.length; i<n; i++) {
                    if ($scope.datasets[i].results == undefined) {
                        return;
                    }
                }
                $scope.showResults();
            }).error(function(response) {
                console.error('An error occurred while retrieving the query response');
            });
            requestsCount++;
        });
        // if no request have been made at all, refresh the chart
        if (requestsCount == 0) {
            $scope.showResults();
        }
    };
    // update the datasets (catches the vent thrown by children dataset controllers)
    $scope.$on('updateDataset', function(e, data) {
        var dataset = $scope.datasets[data.datasetIndex]
        dataset.query = {
            url: data.url,
            filters: data.filters,
            mesured: data.mesured
        };
        dataset.results = undefined;
        $scope.query();
    });
});



// For debugging only!
setTimeout(function(){
    // first dataset
    $('div.corpus select').change();
    $('button.add').first().click();
    setTimeout(function(){
        $('div.corpus select').change();
    //     $('div.filters button').last().click();
    //     var d = $('li.dataset').last();
    //     d.find('select').last().val('metadata').change();
    //     d.find('select').last().val('publication_date').change();
    //     d.find('select').last().val('>').change();
    //     d.find('input').last().val('2010').change();
        
    //     // second dataset
    //     // $('button.add').first().click();
    //     // var d = $('li.dataset').last();
    //     // d.find('select').change();
    //     // // second dataset's filter
    //     // d.find('div.filters button').last().click();
    //     // d.find('select').last().val('metadata').change();
    //     // d.find('select').last().val('abstract').change();
    //     // d.find('select').last().val('contains').change();
    //     // d.find('input').last().val('dea').change();
    //     // refresh
    //     // $('button.refresh').first().click();
    }, 500);
}, 250);