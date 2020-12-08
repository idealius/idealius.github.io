
//Global definitions and functions
//--------------------------------------------------------------------------------------------

// const JXG = require("../third party/jsxgraphsrc");

//Set to true, this should work in Chrome if for instance you have an extension to disable CORS
//*Depecrated, now uses .js files because of CORs
const GOOGLE_DRIVE_DATA = false;



try {
    const INFORM_VERBOSE = true; //Console logging enabled, then alias 'inform' below
    // if (INFORM_VERBOSE) var inform = console.log.bind(window.console)
    if (INFORM_VERBOSE) {
            var inform = console.log.bind(window.console)
    } 
    else var inform = function(){}
}
catch (err){
    alert("Logging unavailable, Error: " + err);
}

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.rem = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};

// check if object is a string, Orwellophile (stackoverflow) 
function isString(x) {
    return Object.prototype.toString.call(x) === "[object String]"
}



//--------------------------------------------------------------------------------------------

//Our namespace to prevent interferring with other libraries or the window namespace
const COVID_SANDBOX_NS = {

    point: function(x,y){this.x=x; this.y=y;},

    x_axis_style: 'dates',

    ranking: "Total",
    days: 15,

    months_abbreviated: false,
    months_run: 0, // doesnt need to fill up namespace
    date_labels: [], // same
    abbv_date_labels: [], // same
    xaxis: {},
    abbv_xaxis: {},

    //For holding updating graph regions on window.resize()
    hold_resize: false,

    filled_graphs: true,

    //Used for rolling avg changes in window
    last_rolling_val: -1,
    last_rolling_bool: -1,

    // region_list:[[]],  //Unique regions avaiable in our dataset, organized by dataset
    regions_of_interest:[],
    browser_context_list:{},

    browser_context: 'desktop',

    max_date: 0, //Number of days of records (for graph visual)
    run: 0, //Number of days of records for data (doesnt include Spanish Flu)
    max_affected: 0, //Highest deaths / cases
    board: NaN,
    rolling_day_average_enabled: true,
    rolling_day_value: NaN,

    last_updated_date: 0,

    region_context: "US",
    affected_context: "Cases",

    viewport_width:$(window).width(),
    viewport_height:$(window).height(),

    //Graphs template, data structure used like:
    // this.graphs[graph_index].graph_data_obj.dataX[day_index]
    graph_status_obj: function(_region_obj, _data_obj, _arrow_obj,  _rolling, _color, _arrow_peak, _context, _max) {
        this.graph_region_label_obj = _region_obj; //JSXGraph object for region label on graph
        this.graph_data_obj = _data_obj; //JSXGraph object for graph data
        this.graph_arrow_obj = _arrow_obj;
        this.rolling_day_avg = _rolling; //Bool setting for rolling data (enabled/disabled)
        this.color = _color; //Color of JSXGraph region label
        this.arrow_peak = _arrow_peak; //point arrow points to
        this.context = _context;
        this.split_context = COVID_SANDBOX_NS.interpret_context(_context);
        this.max = _max;
        this.filled = this.filled_graphs;
    },

    graphs: [],

    axis: {x_axis_obj:'', y_axis_obj:''},

 

    // Just some colors
    custom_colors: {
        0:{value:'#3348FF', gamma: 'dark'}, //blue
        1:{value:'#9133FF', gamma: 'dark'}, //purple
        2:{value:'#FFB433', gamma: 'dark'},  //brown
        3:{value:'#E433FF', gamma: 'dark'},  //magenta
        4:{value:'#33FFF4', gamma: 'bright'},//cyan
        5:{value:'#59FF33', gamma: 'bright'}//green

    },

    //Object for constructing the column name strings for the different datasets.
    header_obj: function(_filename) {
        switch (_filename) {
            case 'covid19_deaths_US_rate':
                this.affected_column = "Deaths (Per Capita)";
                this.region_context = 'US';
                this.region_column = 'Province_State';
                break;
            case 'covid19_confirmed_US_rate':
                this.affected_column = "Cases (Per Capita)";
                this.region_context = 'US';
                this.region_column = 'Province_State';
                break;
            case 'covid19_deaths_global_rate':
                this.affected_column = "Deaths (Per Capita)";
                this.region_context = 'global';
                this.region_column = 'Country/Region';
                break;
            case 'covid19_confirmed_global_rate':
                this.affected_column = "Cases (Per Capita)";
                this.region_context = 'global';
                this.region_column = 'Country/Region';
                break;
            case 'spanish_flu_conversion':
                this.affected_column = "Deaths (Per Capita)";
                this.region_context = 'country';
                this.region_column = 'Country/Region';
                break;
            default: //unused
                this.region_context = 'US';
                this.region_column = 'Country/Region';
                this.affected_column = "Cases (Per Capita)";
                break;
        }
        this.date_column = "Date"
    },

   //Object class for different datasets
   browser_context_template: function(_context, _graph_region_font_size, _graph_region_outline, _axis_font_size, ) {
    // var data2 = _data; //this is a required buffer between data & _data
    // var columns2 = new this.header_obj(_filename);
    var obj = {
        [_context]:{graph_region_font_size: _graph_region_font_size,
                    graph_region_outline: _graph_region_outline,
                    axis_font_size: _axis_font_size,
        }
    }

    return obj;
},

    //Datasets for all regions / contexts
    //Used like:
    //affected_data[filename]
    //->              [filename].data[index][column_name] //actual numerical records
    //->              [filename].columns.affected_column //deaths or cases column name
    //->              [filename].columns.region_context //US or world
    //->              [filename].columns.region_column //State / Country column names
    //->              [filename].columns.date          //date column name
    //->              [filename].region_list          //list of unique sub-regions
    

    affected_data_template: function(_filename, _data) {
        var data2 = _data; //this is a required buffer between data & _data
        var columns2 = new this.header_obj(_filename);
        var obj = {
            [_filename]:{data: data2,
                        columns: columns2,
                        region_list: -1
            },
        }

        return obj;
    },

    //Regions template, data structure used like:
    //this.regions_of_interest[graph_index].data[days_index][affected_column_name]
    push_region_obj: function(_parent_array, _filename, _data, _region) {
        var data2 = _data; //this is a required buffer between data & _data <- confirmed
        var columns2 = new this.header_obj(_filename);
        // var context2 = new interpret_context(_filename);
        var context2 = _filename;
        var split_context2 = this.interpret_context(context2); //.affected / .region
        var region2 = _region;
        var obj = {data:data2, columns:columns2, region:region2, context:context2, split_context:split_context2};
        _parent_array.push({});
        Object.assign(_parent_array[_parent_array.length-1], obj);
        return;
        // return this.regions_of_interest.length-1; //return our index
    },


    //Just to make accessing data columns shorter / better named:
    us_death_rate : "covid19_deaths_US_rate",
    us_case_rate : "covid19_confirmed_US_rate",
    global_death_rate : "covid19_deaths_global_rate",
    global_case_rate : "covid19_confirmed_global_rate",
    uk_spanish_flu_deaths: "spanish_flu_conversion",

    //Return dataset context
    get_context: function() {
        if (this.region_context == "US") {
            if (this.affected_context == "Cases") return this.us_case_rate;
            else return this.us_death_rate;
        }
        else {
            if (this.affected_context == "Cases") return this.global_case_rate;
            else return this.global_death_rate;
        }
    },

    //Might not need this.
    interpret_context: function(_context){
        _return = {region:'',affected:''}
        switch (_context) {
            case this.us_case_rate:
                _return.region = 'US';
                _return.affected = 'Cases';
                break;
            case this.us_death_rate:
                _return.region = 'US';
                _return.affected = 'Deaths';
                break;
            case this.global_case_rate:
                _return.region = 'Global';
                _return.affected = 'Cases';
                break;
            case this.global_death_rate:
            case this.uk_spanish_flu_deaths:
                _return.region = 'Global';
                _return.affected = 'Deaths';
                break;
            default:
            break;
        }
        return _return;
    },

    set_context: function(_region, _affected) {
        if (_region.toUpperCase() == "US") { //.toUpperCase just to avoid any case mistakes
            _region = "US"; 
            $("#region_context_us").prop('checked', true);
            $("#region_context_global").prop('checked', false);
        }
        else {
            _region = "Global"
            $("#region_context_global").prop('checked', true);
            $("#region_context_us").prop('checked', false);
        }


        if (_affected.toUpperCase() == "CASES") {
            _affected = "Cases";
            $("#affected_context_cases").prop('checked', true);
            $("#affected_context_deaths").prop('checked', false);
        }
        else {
            _affected = "Deaths";
            $("#affected_context_deaths").prop('checked', true);
            $("#affected_context_cases").prop('checked', false);
        }

        this.region_context = _region;
        this.affected_context = _affected;
    },

    affected_data:{}, //Array of deaths / cases
    //Datasets for all regions / contexts
    //Used like:
    //affected_data[filename]
    //->              [filename].data[index][column_name] //actual numerical records
    //->              [filename].columns.affected_column //deaths or cases column name
    //->              [filename].columns.region_context //US or world
    //->              [filename].columns.region_column //State / Country column names
    //->              [filename].columns.date          //date column name
    //->              [filename].region_list          //list of unique sub-regions
    
    //Main data loading function from JS/Google Drive and applies data to page as well as initalizing graph
    process_data: function(_filename, _data) {
        "use strict";


        var new_dataset = this.affected_data_template(_filename, _data);
        inform(_filename);

        
        Object.assign(this.affected_data, new_dataset);
        this.remove_invalid_regions(_filename);
  
        var _to_number = [this.affected_data[_filename].columns.affected_column]; //make an array in case we have multiple number values
        var _to_date = "Date";
        // This next line shows why we use temp variables to shorten code later on:
        for (var i = 0; i < this.affected_data[_filename].data[this.affected_data[_filename].data.length-1][this.affected_data[_filename].columns.affected_column].length; i++) {
            //convert strings from our table that should be numbers to numbers
            for (var i_2 = 0, len = _to_number[i_2].length; i_2 < len; i_2++) { 
                this.affected_data[_filename].data[i][_to_number[i_2]] = Number(this.affected_data[_filename].data[i][_to_number[i_2]])
            }
            //convert dates to date types
            // data_buffer[counter][_to_date] = new Date(data_buffer[counter][_to_date]);
            this.affected_data[_filename].data[i][_to_date] = new Date(this.affected_data[_filename].data[i][_to_date]);
        }

        this.affected_data[_filename].region_list = this.find_unique_regions(this.affected_data[_filename].data, this.affected_data[_filename].columns.region_column);

        inform(this.affected_data);
    
    },

    //Removes regions with affected (per capita) values == -1
    remove_invalid_regions: function(_filename) {
        _data = this.affected_data[_filename];

        var current_region = ""
        for (var i=0; i<_data.data.length;i++) {
            if (_data.data[i][_data.columns.affected_column] == -1) {
                current_region = _data.data[i][_data.columns.region_column];
                
                while (current_region ==  _data.data[i][_data.columns.region_column]) {
                    _data.data.splice(i,1);
                    // no i++ because, somewhat confusingly, splice re-indexes the array as it goes, so the i doesn't need to increment
                }
                i=0; //Guam has one extra row so just start over each time
            }
        }

        return _data;
    },

    //Code based on https://www.intmath.com/cg3/jsxgraph-axes-ticks-grids.php
    //Months on x-axis
    alt_x_axis: function() {
        // JXG.Options.slider.ticks.majorHeight = 0;

        this.board = JXG.JSXGraph.initBoard('jsxbox',{
          boundingbox: [-50,this.max_affected.y,this.max_date+20,-.05], 
          axis:false, 
          renderer: 'canvas',
          showCopyright:false,  
          showNavigation:false,
          zoom: {factorX:1.15,factorY: 1.15,wheel:true,needshift:false,min:0.1},
          pan: {needTwoFingers: false, needShift: false}
         } 
        );
  
        // var xAxPt0 = this.board.create('point', [0,0], {
        //     needsRegularUpdate: false, visible: false});
        // var xAxPt1 = this.board.create('point', [1,0], {
        //     needsRegularUpdate: false, visible: false});

        COVID_SANDBOX_NS.xaxis = this.board.create('axis', 
            [[0,0],[1,0]], {
            needsRegularUpdate: false,
            majorHeight: 15,
            strokeColor: 'grey',
            fontsize:this.browser_context_list[this.browser_context].axis_font_size
            });
            // inform(this.xaxis);

        COVID_SANDBOX_NS.abbv_xaxis = this.board.create('axis', 
            [[0,0],[1,0]], {
            needsRegularUpdate: false,
            majorHeight: 15,
            strokeColor: 'grey',
            fontsize:this.browser_context_list[this.browser_context].axis_font_size
        });




        this.xaxis.removeTicks(this.xaxis.defaultTicks);
        this.abbv_xaxis.removeTicks(this.abbv_xaxis.defaultTicks);
        // xaxis_years.removeTicks(xaxis_years.defaultTicks);

        this.months_run = []//[...Array(365).keys()]; //this.max_date
        ;
        var start_date = new Date(2020, 0, 21); //months starts at 0 instead of 1, so this is 1/21/2020
        var date_conversion = 1000*60*60*24;
        var years_run = [];
        var years_array = [];
        var last_year = 0;
        const month_names = ["Jan", "Feb", "Mar", "Apr", "May", "June",
        "July", "Aug", "Sept", "Oct", "Nov", "Dec"
        ];
        // for (var i = 0; i < this.max_affected.x+60; i++) {
        for (var i = 0; i < 365*3; i++) {
            var new_date = new Date(start_date.getTime() + i * date_conversion);
            if (new_date.getDate() == '1') {
                var year = String(new_date.getFullYear());
                year = year.slice(2);
                years_array.push('\'' + year);
                years_run.push(i);
                // var date_str = (new_date.getMonth() + 1) + '/' + new_date.getDate() //+ '/' + year;  //have to add one since months start at 0
                var date_str = month_names[new_date.getMonth()];  // + year;
                var abb_date_str = date_str.slice(0,1);
                this.months_run.push(i-1);
                this.date_labels.push(date_str);
                this.abbv_date_labels.push(abb_date_str);
            }
        }
        
        //Months
        this.xaxis.ticks = this.board.create('ticks', [this.xaxis, 
            this.months_run], {
            labels: this.date_labels,
            majorHeight: 15, 
            drawLabels: true, 
            needsRegularUpdate: false,
            visible: true,
            label: {
                visible: true,
                cssClass:"region_labels_bright",
                highlight: false,
                offset:[0,-20],
                fontsize:this.browser_context_list[this.browser_context].axis_font_size,
                anchorX: 'left', anchorY: 'bottom',
                fontsize:this.browser_context_list[this.browser_context].axis_font_size
            },
            // precision:5
          });
          
        this.abbv_xaxis.ticks = this.board.create('ticks', [this.abbv_xaxis, 
            this.months_run], {
            labels: this.abbv_date_labels,
            majorHeight: 15, 
            drawLabels: false, 
            needsRegularUpdate: false,
            visible: false,
            label: {
                visible: true,
                cssClass:"region_labels_bright",
                highlight: false,
                offset:[0,-20],
                fontsize:this.browser_context_list[this.browser_context].axis_font_size,
                anchorX: 'left', anchorY: 'bottom',
                fontsize:this.browser_context_list[this.browser_context].axis_font_size
            },
            // precision:5
          });
        // var ticks_years = this.board.create('ticks', [xaxis_years, 
        // years_run], {
        // labels: years_array,
        // majorHeight: 15, 
        // drawLabels: true, 
        // needsRegularUpdate: false,
        //     label: {
        //         cssClass:"region_labels_bright",
        //         highlight: false,
        //         offset:[0,0],
        //         fontsize:this.browser_context_list[this.browser_context].axis_font_size,
        //         anchorX: 'left', anchorY: 'bottom',
        //     },
        // });

        inform(this.xaxis);
        // var xTicks, yTicks, bb;
        var yTicks, bb;
        // xaxis.defaultTicks.ticksFunction = function () { return xTicks; };
        this.board.fullUpdate(); // full update is required
        var coords=[];
        var xPt0 = function(offset) {
            coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [0, offset], COVID_SANDBOX_NS.board);	
            return coords.usrCoords;
        }
        var xPt1 = function(offset) {
            coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [COVID_SANDBOX_NS.board.canvasWidth, offset], COVID_SANDBOX_NS.board);
            return coords.usrCoords;
        }
        var yAxPt0 = this.board.create('point', [0,0], {
            needsRegularUpdate: false, visible: false});
        var yAxPt1 = this.board.create('point', [0,1], {
            needsRegularUpdate: false, visible: false});	

        var yaxis = this.board.create('axis', [yAxPt0,yAxPt1], {
            needsRegularUpdate: false, 
            ticks:{
                scaleSymbol: '%',
                label:{offset:[10,0],precision:8,
                    fontsize:this.browser_context_list[this.browser_context].axis_font_size}
            } 
          }
        );

        yaxis.defaultTicks.ticksFunction = function () { return yTicks; };
        this.board.fullUpdate();
        var yPt0 = function(offset) {
            coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [offset,COVID_SANDBOX_NS.board.canvasHeight], COVID_SANDBOX_NS.board);
            return coords.usrCoords;
        }
        var yPt1 = function(offset) {
            coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [offset,0], COVID_SANDBOX_NS.board);
            return coords.usrCoords;
        }
        var setTicks = function() {
            bb = COVID_SANDBOX_NS.board.getBoundingBox();
            yTicksVal = Math.pow(10, Math.floor((Math.log(0.6*(bb[1]-bb[3])))/Math.LN10)); //changed from .6 to .006
            if( (bb[1]-bb[3])/yTicksVal > 5) {
              yTicks = yTicksVal;
            } else {
              yTicks = 0.5* yTicksVal;
            }
            COVID_SANDBOX_NS.board.fullUpdate(); // full update is required
        }
        setTicks();
        var origPt = this.board.create('point', [0,0],{visible:false});
        this.board.on('boundingbox', function() {
            bb = COVID_SANDBOX_NS.board.getBoundingBox();
            mycoordsY = new JXG.Coords(JXG.COORDS_BY_USER, [0,origPt.Y()], COVID_SANDBOX_NS.board);
            yPixels = mycoordsY.scrCoords[2];
            mycoordsX = new JXG.Coords(JXG.COORDS_BY_USER, [0,origPt.X()], COVID_SANDBOX_NS.board);
            xPixels = mycoordsX.scrCoords[1];

            //Next section commented out because it slows down panning too much:
            // if( 30 > yPixels) {	
            //     xAxPt0.moveTo (xPt0(40),0); //4
            //     xAxPt1.moveTo (xPt1(40),0); //4
            //     xaxis.point1.setAttribute({frozen: true});
            //     xaxis.point2.setAttribute({frozen: true});
            //     xaxis.setAttribute({strokeColor: '#111'});
            //     ticks.visProp.label.offset = [0,-20];
            // } else if( yPixels > COVID_SANDBOX_NS.board.canvasHeight - 30) {
            //     xAxPt0.moveTo (xPt0(COVID_SANDBOX_NS.board.canvasHeight -10),0); //-10
            //     xAxPt1.moveTo (xPt1(COVID_SANDBOX_NS.board.canvasHeight - 10),0); //-10
            //     xaxis.point1.setAttribute({frozen: true});
            //     xaxis.point2.setAttribute({frozen: true});
            //     xaxis.setAttribute({color: '#111'});
            //     xaxis.setAttribute({strokeColor: '#111'});
            //     ticks.visProp.label.offset = [0,20];
            // } else {
            //     xaxis.point1.setAttribute({frozen: false});
            //     xaxis.point2.setAttribute({frozen: false});
            //     xaxis.setAttribute({color:'#666'});
            //     xAxPt0.moveTo ([0,0],0);
            //     xAxPt1.moveTo ([1,0],0);
            //     ticks.visProp.label.offset = [0,-20];
            // }	
            if( 30 > xPixels) {
                yAxPt0.moveTo (yPt0(25),0); //5
                yAxPt1.moveTo (yPt1(25),0); //5
                yaxis.point1.setAttribute({frozen: true});
                yaxis.point2.setAttribute({frozen: true});
                yaxis.setAttribute({strokeColor: '#111'});
                yaxis.defaultTicks.visProp.label.offset = [7,0]; //7
            } else if( xPixels > COVID_SANDBOX_NS.board.canvasWidth-30) {

                yAxPt0.moveTo (yPt0(COVID_SANDBOX_NS.board.canvasWidth-25),0); //-5
                yAxPt1.moveTo (yPt1(COVID_SANDBOX_NS.board.canvasWidth-25),0); //-5
                yaxis.point1.setAttribute({frozen: true});
                yaxis.point2.setAttribute({frozen: true});			
                yaxis.setAttribute({strokeColor: '#111'});
                yaxis.defaultTicks.visProp.label.offset = [-35,0]; //-28
                yaxis.defaultTicks.visProp.label.align = 'right';
            } else {           
                yaxis.point1.setAttribute({frozen: false});
                yaxis.point2.setAttribute({frozen: false});
                yaxis.setAttribute({strokeColor: '#666'});
                yAxPt0.moveTo ([0,0],0);
                yAxPt1.moveTo ([0,1],0);
                yaxis.defaultTicks.visProp.label.offset = [7,0]; //7
            }
            setTicks();
        });
    },

    //Create a blank graph with dimensions defined by the first region's data (Alabama)
    initialize_graph: function() {

        // this.regions_of_interest.pop();
        var context = this.get_context();

        var _parent_data = this.affected_data[context];
        this.fill_regions_dropdown(_parent_data.region_list);

        var _region_column = _parent_data.columns.region_column;
        var _data = this.affected_data[context].data;
        var temp_region = [];
        // push_region_obj(temp_region, context, this.affected_data[context].data, this.affected_data[context].data[0][this.affected_data[context].columns.affected_column]);
        this.create_region_of_interest(temp_region, _data[0][_region_column], context, true);

        this.max_date = temp_region[0].data.length;
        this.run = temp_region[0].data.length;

        var _affected_column = _parent_data.columns.affected_column;
        this.max_affected = this.get_max_base_affected(temp_region[0], _affected_column);
        this.max_affected.y = this.max_affected.y + this.max_affected.y / 8;
        inform (this.max_affected);

 

        JXG.Options.text.cssDefaultStyle = '';
        JXG.Options.text.highlightCssDefaultStyle = '';

        var new_browser_context = this.browser_context_template("desktop", 18, false, 14);
        Object.assign(this.browser_context_list, new_browser_context);

        new_browser_context = this.browser_context_template("mobile", 11, true, 10);
        Object.assign(this.browser_context_list, new_browser_context);

        this.viewport_width = $(window).width();
        this.viewport_height = $(window).height();
        inform(this.viewport_width);

        if (this.viewport_width < 768) this.browser_context = 'mobile';
        else this.browser_context = 'desktop';
        if (this.x_axis_style == 'dates') {
            this.alt_x_axis();
        }
        else {
            this.board = JXG.JSXGraph.initBoard('jsxbox', {
                boundingbox: [-50,this.max_affected.y,this.max_date+20,-.05],
                // boundingbox: [0,10,10,0],
                //keepaspectratio: true,
                showcopyright: false,
                axis: true,
                renderer: 'canvas',
                defaultAxes: {
                    x: {
                        strokeColor: 'grey',
                        ticks: {
                            visible: 'inherit',
                            fontsize: 5,
                            label: {
                                fontsize:this.browser_context_list[this.browser_context].axis_font_size
                            }
                        },
                        
                        // withLabel: true
                    },
                    y: {
                        strokeColor: 'grey',
                        ticks: {
                            visible: 'inherit',
                            fontsize: 5,
                            label: {
                                fontsize:this.browser_context_list[this.browser_context].axis_font_size
                            }
                        }
                        
                        // withLabel: true
                    },
                },
                zoom: {
                    factorX: 1.15,
                    factorY: 1.15,
                    wheel: true,
                    needshift: false,
                    min: 0.1
                },
                pan: {
                    needTwoFingers: false,
                    needShift: false
                },
        
                showZoom: false,
                showNavigation: false
            });
        }
        
        this.add_axes();
        this.board.on('update', function (){ COVID_SANDBOX_NS.update_axes();});


        inform(this.board);

        // var x = [...Array(this.max_date).keys()];
        // var y = this.extract_affected(temp_region[0].data, temp_region[0].columns.affected_column);


     

        this.board.update();

        // this.board.on('update', this.update_axes());

        this.max_affected.y = 0; //reset so adding deaths doesn't show a large y-axis bounding box.
        delete temp_region;
    },

    //Updates axes and arrows
    update_axes: function() {
        //this.board.update();

        //AXES:
        var bounding_box = this.board.getBoundingBox(); //returns 4 element array: 0-left, 1-upper, 2-right, 3-lower

        if (this.x_axis_style != "dates") var factor = 3;
        else {

            var factor = 7;
            var threshold = this.viewport_width * .650054 + 220.758 // f(x) = .650(x) + 220

            if (bounding_box[2] - bounding_box[0] > threshold && !this.months_abbreviated) {
                // this.xaxis.ticks.setAttribute({label:{visible: false}});
                // this.abbv_xaxis.ticks.setAttribute({label:{visible: true}});
                this.xaxis.ticks.setAttribute({drawLabels: false});
                this.abbv_xaxis.ticks.setAttribute({drawLabels: true});
                
                this.months_abbreviated = true;
                // this.board.update();
            }
            else if (bounding_box[2] - bounding_box[0] <= threshold && this.months_abbreviated) {
                // this.xaxis.ticks.setAttribute({label:{visible: true}});
                // this.abbv_xaxis.ticks.setAttribute({label:{visible: false}});
                this.xaxis.ticks.setAttribute({drawLabels: true});
                this.abbv_xaxis.ticks.setAttribute({drawLabels: false});

                this.months_abbreviated = false;
                // this.board.update();
            }
            // inform(this.xaxis.ticks);
            
        }

        if (bounding_box[2] > Math.abs(bounding_box[0])) var x_offset = (bounding_box[2] / 2 );
        else var x_offset = bounding_box[0] /2
        var y_offset = -(bounding_box[1] -bounding_box[3]) / factor;

        this.axis.x_axis_obj.setPosition(JXG.COORDS_BY_USER, [x_offset,y_offset]);
    

        x_offset = -(bounding_box[2] - bounding_box[0]) / 30;
        if (bounding_box[1] > Math.abs(bounding_box[3])) y_offset = (bounding_box[1] / 10 );
        else {
            y_offset = bounding_box[3]
        }
    
        this.axis.y_axis_obj.setPosition(JXG.COORDS_BY_USER, [x_offset,y_offset]);

      
        this.board.fullUpdate();


    },


    add_axes: function() {

        //rather than duplicate the x and y position calculations, just set them to zero and call update_axes():

        this.axis.x_axis_obj = this.board.create('text', [
            //X,Y value:
            0, 0,
            'Days since 1/22/20'
            ], {
            display: 'internal',
            anchorX: "middle",
            anchorY: "bottom", // <- should be top, but jsgx does opposite of what I expect.
            cssClass: "region_labels_bright", 
            highlightCssClass: "region_labels_bright_highlight",
            fontSize: this.browser_context_list[this.browser_context].axis_font_size,
            strokeColor: 'black',
            highlight: false,
            needsRegularUpdate:true,
            // rotate: 90,
            fixed: true // works
        });
 


        this.axis.y_axis_obj = this.board.create('text', [
            //X,Y value:
            0, 0,
            'Rate Change as % of Region Population'
            ], {
            display: 'internal',
            anchorX: "left",
            anchorY: "top", // <- should be top, but jsgx does opposite of what I expect.
            cssClass: "region_labels_bright", 
            highlightCssClass: "region_labels_bright_highlight",
            fontSize:this.browser_context_list[this.browser_context].axis_font_size,
            strokeColor: 'black',
            highlight: false,
            rotate: 90,
            needsRegularUpdate:true,
            fixed: true // works
        });


        this.update_axes();
    },

    remove_graph: function(_region_name) {
        var _context = this.get_context();
        for (var i = 0; i < this.graphs.length; i++) {
            if (this.graphs[i].graph_region_label_obj.plaintext.search(_region_name) != -1) {
                if (_context == this.graphs[i].context) {
                    this.board.removeObject(this.graphs[i].graph_arrow_obj);
                    this.board.removeObject(this.graphs[i].graph_region_label_obj);
                    this.board.removeObject(this.graphs[i].graph_data_obj);
                    this.graphs.splice(i, 1);
                    this.regions_of_interest.splice(i, 1);
                    return;
                }
            }
            
        }
    },

    clear_all: function(_reset_bounds) {
        if (_reset_bounds) {
            this.max_affected.x = 0;
            this.max_affected.y = 0;
        }
        inform(this.board);
        for (var i = 0; i < this.graphs.length; i++) {
            this.board.removeObject(this.graphs[i].graph_arrow_obj);
            this.board.removeObject(this.graphs[i].graph_region_label_obj);
            this.board.removeObject(this.graphs[i].graph_data_obj);
            delete this.graphs[i];
            delete this.regions_of_interest[i];
        }

        //Doesn't appear to hurt, may help browser garbage collection:
        this.board.objectsList.forEach(element => COVID_SANDBOX_NS.board.removeObject(element));
        
        this.board.removeEventHandlers(); // Prevents ghost x axis events
        // JXG.JSXGraph.freeBoard(this.board); //errors on removing ticks
        this.graphs = [];
        this.regions_of_interest = [];
        // this.board.update();

    },

    //search graphs[] for duplicates by region name and context (filename)
    duplicate_graph_check: function(_region, _context) {
        var src = _region;

        // if (_selected_region_parent_data[_index].context != _context) return false;

        for (var i = 0; i < this.graphs.length; i++) {
            if (this.graphs[i].graph_region_label_obj.plaintext.search(src) != -1) {
                // inform(this.graphs[i]);
                if (_context == this.graphs[i].context) return true;
                // inform (_context);
                // inform(this.graphs[i].context);
            }
        }
        return false;
    },

    //Calls constructor for graphs[] where each graph's information is stored (including JSXGraph's) typically used with regions_of_interest[]
    add_region_to_graph: function(_selected_region_parent_data, _index, _context) {
  
        //most cases we will automate the index to the last index of the array
        if (_index == -1) _index = _selected_region_parent_data.length-1;
        var _selected_region = _selected_region_parent_data[_index];
        


        //Used for keeping track of the highest value for bounding box settings
        var header_factor = 8; // e.g. when set to 5 adds 20% to the top.
        new_max_affected = this.get_max_base_affected(_selected_region, _selected_region.columns.affected_column);
        peak = new_max_affected.y;
        run = new_max_affected.x;
        var return_max_affected = new_max_affected;


        // new_max_affected.y = new_max_affected.y + new_max_affected.y / header_factor
        // var data_context = this.regions_of_interest[__selected_region]._region_obj
        if (new_max_affected.y > this.max_affected.y) this.max_affected.y = new_max_affected.y;
        if (new_max_affected.x > this.max_affected.x) this.max_affected.x = new_max_affected.x
    

        //numeric date
        this.max_date = this.max_date < _selected_region.data.length ? _selected_region.data.length : this.max_date;
        this.board.setBoundingBox([-20,this.max_affected.y,this.max_date * 2+20,-this.max_affected.y / 3]);
        this.board.update();

        var x = [...Array(_selected_region.data.length).keys()];
        var y = this.extract_affected(_selected_region.data, _selected_region.columns.affected_column);

        var my_color_index = _index % Object.keys(this.custom_colors).length;

        var my_color = this.custom_colors[my_color_index].value;
        var fill_color = this.filled_graphs ? my_color : 'none';
       

        var graph = this.board.create('curve', [x,y], {
            strokeColor:my_color,
            fillColor:fill_color, 
            fillOpacity:.5, 
            name:"curve", 
            strokeWidth:1.5,
            fixed: true,
            highlight: false
            // withlabel: true
            // dragToTopOfLayer: true
        });

        // ****************Region Label Object*******************

        // JXG.Options.text.cssDefaultStyle = '';
        // JXG.Options.text.highlightCssDefaultStyle = '';
        
        var region_labels_style;

        if (!this.browser_context_list[this.browser_context].graph_region_outline) {
            if (this.custom_colors[my_color_index].gamma == 'dark') region_labels_style ="region_labels_dark"; //_dark for original config
            else region_labels_style = "region_labels_bright";    
        } 
        else {
            if (this.custom_colors[my_color_index].gamma == 'dark') region_labels_style ="region_labels_dark"; //_dark for original config
            else region_labels_style = "region_labels_bright_mobile";    
        }

        //Interpret_context gives us "Cases" or "Deaths" without the "Per Capita" part:
        // var label_context = this.interpret_context(_selected_region_parent_data[_index].context);
        var label_context = _selected_region_parent_data[_index].split_context.affected;

        // inform(this.interpret_context(_selected_region_parent_data[_index].context));
        // inform(_selected_region);
        // var region_txt = _selected_region.data[0][_selected_region.columns.region_column] + " (" + label_context.affected + ")";
        var region_txt = _selected_region.region + " (" + label_context + ")";


        var _font_size = this.browser_context_list[this.browser_context].graph_region_font_size;

        var label = { x: run, 
                      y: peak + peak / 8
                    };

        var region_txt_obj = this.board.create('text', [
            //X,Y value:
            label.x, label.y, //careful not to go too far right or jsxgraph crops text object's box size for dragging
            // this.max_affected.x / 2, peak / 2,
            region_txt
            ], {
            anchorX: "middle",
            anchorY: "bottom", // jsxg does opposite of what I expect, top is intended.
            cssClass: region_labels_style, 
            highlightCssClass: region_labels_style + "_highlight",
            // strokeColor: 'red',
            // isLabel: true,
            fontSize: _font_size,
            strokeColor: my_color,
            // highlight: false,
            // rotate: 90,// only works if display is set to internal
            // highlightStrokeColor: my_color,
            // dragToTopOfLayer: true,

            fixed: false // works
        });
        // region_txt_obj.setText(region_txt + '     '); //this actually works to update text
        // this.board.fullUpdate();
        // region_txt_obj.setPosition(JXG.COORDS_BY_USER, [label.x-this.,label.y]);

        // ****************Arrow/Line Label Object*******************
        var fill_offset = this.filled_graphs == true ? -1 : 0;
        var arrow_peak = [run+fill_offset,peak];
        
        var arrow_obj = this.board.create('line', 
            //point coords
            // [region_txt_obj, [arrow_peak[0], arrow_peak[1]]], {
            [[label.x, label.y], [arrow_peak[0], arrow_peak[1]]], {
            straightFirst:false, straightLast:false,
            strokeWidth:2, dash:1,
            fixed: true,
            strokeColor: my_color,
            strokeOpacity: .5
            });


        region_txt_obj.on('move', function(){
            // var point = this.coords.usrCoords;
            // var bounding_box = COVID_SANDBOX_NS.board.getBoundingBox();
            // var vert_scale = bounding_box[1] - bounding_box[3];
            // point[2] = point[2] + (COVID_SANDBOX_NS.browser_context_list[COVID_SANDBOX_NS.browser_context].graph_region_font_size  * (this.content.split(" ").length - 1))/ vert_scale;
            // arrow_obj.point1.setPosition(JXG.COORDS_BY_USER, point);
            arrow_obj.point1.setPosition(JXG.COORDS_BY_USER, this.coords.usrCoords);
            // console.log(this);
        });
     

        // board.on('update', function(){console.log('updated', point.X(), point.Y())});

        construct = new this.graph_status_obj(region_txt_obj, graph, arrow_obj, -1, my_color, arrow_peak, _context, return_max_affected); // set rolling avg to -1 so its updated later at update_rolling_average()
 

        var graph_index = this.graphs.length; //since we check it before the push() it will equal current .length
        this.graphs.push(construct);
        
        this.add_tidy_endpoints(this.graphs[graph_index].graph_data_obj);


        if (this.rolling_day_average_enabled) {
            
            this.update_rolling_average(_selected_region_parent_data);
            // this.clip_bounding_box_by_graph();
            // this.arrange_region_labels(-1);
            
        }
        else 
            this.update(); //required to update graph's new curve

        return return_max_affected;

    },

    arrange_region_labels: function() {
        _graph_max_affected = [];
        
        var _box = this.board.getBoundingBox(); //returns 4 element array: left, upper, right, lower
        var _vert_space = _box[1];
        //Get values

        // inform(this.ranking);
        var highest_affected = {x:0, y:0, total:0, index:0};
        for (var i = 0; i < this.graphs.length; i++) {
        
            // if (_graph_max_affected[i].y > highest_affected) highest_affected = _graph_max_affected
            _graph_max_affected.push(this.get_max_graph_affected(i));
            
            if (this.ranking == "Total") {
                //we use temp variable here because we only want the total from the regions list, the peaks we want from the graphs.
                _temp_max_affected = this.get_max_base_affected(this.regions_of_interest[i], this.regions_of_interest[i].columns.affected_column);
                // inform(_temp_max_affected);
                _temp_max_affected.x = _graph_max_affected[i].x //not sure we need x & y here
                _temp_max_affected.y = _graph_max_affected[i].y
                highest_affected = _temp_max_affected.total > highest_affected.total ? _temp_max_affected : highest_affected;
                _graph_max_affected[i].total = _temp_max_affected.total;
            }
            else if (this.ranking == "Peak") highest_affected = _graph_max_affected[i].y > highest_affected.y ? _graph_max_affected[i] : highest_affected;
            else {
                _graph_max_affected[i].linreg = this.do_linear_regression(i, this.days);
            }
            
            _graph_max_affected[i].index = i;
        }
        // inform(_graph_max_affected);
        if (this.ranking == "Total") {
            _graph_max_affected.sort(function(a, b) {return b.total - a.total;}); //sort by descending
        }
        else if (this.ranking == "Peak") _graph_max_affected.sort(function(a, b) {return b.y - a.y;}); //sort by descending
        else if (this.ranking == "Slope") _graph_max_affected.sort(function(a, b) {return b.linreg.slope - a.linreg.slope;}); //sort by descending
        // inform(_graph_max_affected);

        //Translate / arrange on graph canvas
        var bounds = this.board.getBoundingBox(); //returns 4 element array: 0-left, 1-upper, 2-right, 3-lower
        var left = bounds[0] + 100;
        // var width = bounds[2] - bound[0];
        if (bounds[2] > this.run + this.run * .25) {//If we're scrolled far enough right lets start at the far right
            left = this.run - 100;
        }
        // else if (bounds[2] > 0) { //If we're scrolled far enough right lets 'center' around peak
        //     left = highest_affected.x - 100;
        // }
        // else left = 100;  //Otherwise let's align to the right of the y axis
        var vert_percent = 75;
        var row_size = 4; // number of labels in each column
        _vert_space = _vert_space * (vert_percent / 100);
        var column_size = -.0787402*this.viewport_width + 283; // space between columns = f(x) = 0.078(x) + 283
        var min = _vert_space / (row_size * 2); //buffer between x axis and labels

        //distribute labels in rows / columns
        for (var i = 0; i < this.graphs.length; i++) {
            var i2 = i+1;

            x = left;
            y = _vert_space  - (_vert_space / row_size * i);

            while (y < min) { // move over to another column.
                y += _vert_space;
                x += column_size;
            }
            
            y += min;

            var _index = _graph_max_affected[i].index;
            var _region_label_obj = this.graphs[_index].graph_region_label_obj;
            
            //Remove numbering if already present
            var find_result = _region_label_obj.plaintext.lastIndexOf('.');
            if (find_result != -1) {
                _region_label_obj.plaintext = _region_label_obj.plaintext.slice(find_result+1, _region_label_obj.plaintext.length);
            }
            _region_label_obj.setText(i2 + '. ' + _region_label_obj.plaintext);// + _graph_max_affected[i].total);

            _region_label_obj.setPosition(JXG.COORDS_BY_USER, [x,y]); //update text label position
            this.graphs[_index].graph_arrow_obj.point1.setPosition(JXG.COORDS_BY_USER, _region_label_obj.coords.usrCoords); //update arrow position
        }
        this.board.update();
    },
    
    //Clip by active graph data potentially put through rolling average / other transformations versus underlying actual data.
    clip_bounding_box_by_graph: function() {
        var _max_y = 0;
        if (this.graphs.length == 0) return;
        for (var i = 0; i <this.graphs.length; i++) {
            for (var i2 = 0; i2 < this.graphs[i].graph_data_obj.dataY.length; i2++) {
                if (this.graphs[i].graph_data_obj.dataY[i2] > _max_y) {
                    _max_y = this.graphs[i].graph_data_obj.dataY[i2];
                    // var last_obj = this.graphs[i].graph_data_obj;
                }
            }
        }

        this.board.setBoundingBox([-20,_max_y + _max_y / 8, this.max_date+20,-_max_y / 3]);
    },

    remove_top_regions: function(_num_regions, _num_days, _style){

        if (this.run < 1) this.run = 1;

        if (_num_days > this.run) _num_days = this.run;
        else if (_num_days < 1) _num_days = 1;
        if (_num_regions > this.graphs.length) _num_regions = this.graphs.length;
        else if (_num_regions < 1) _num_regions = 1;

        _graphs_list = []; //checklist of graphs to be removed
        for (var i = 0; i < this.regions_of_interest.length; i++) {
            var _total = 0;
            // var _context = this.interpret_context(this.regions_of_interest[i].context);
            if (_style == "Fastest Rising") {
                var _linreg = do_linear_regression_graph(i, this.days);
                _graphs.list.push({linreg: _linreg, index: i});
            }
            else {
                var _context = this.regions_of_interest[i].columns.affected_column;
                for (var days_counter = this.run - _num_days; days_counter < this.run; days_counter++)
                {
                    _total += this.regions_of_interest[i].data[days_counter][_context];
                }
                _graphs_list.push({total: _total, index: i});
            }
        }

        if (_style == "Fastest Rising") _graphs_list.sort(function(a, b) {return b.linreg.slope - a.linreg.slope;});
        else _graphs_list.sort(function(a, b) {return b.total - a.total;}); //sort by descending total
        _graphs_list.splice(_num_regions, _graphs_list.length - _num_regions); //remove bottom regions from checklist
        _graphs_list.sort(function(a, b) {return b.index - a.index;}); //sort by descending index to prevent reindex problems with splice below

        inform(_graphs_list);
        // inform(this.graphs);
        // inform(this.regions_of_interest);

        for (var i = 0; i < _graphs_list.length; i++) {
            var index = _graphs_list[i].index;
            this.board.removeObject(this.graphs[index].graph_arrow_obj);
            this.board.removeObject(this.graphs[index].graph_region_label_obj);
            this.board.removeObject(this.graphs[index].graph_data_obj);
            this.graphs.splice(index, 1);
            this.regions_of_interest.splice(index, 1);

        }

        // inform(this.graphs);
        // inform(this.regions_of_interest);


        
        this.arrange_region_labels();
        
    },

    find_my_index: function(_region, _context) {
        for (var i = 0; i < this.regions_of_interest.length; i++) {
            if (this.regions_of_interest[i].region == _region && this.regions_of_interest[i].context == _context) return i;
        }
    },

    recalculate_peaks_totals: function(){
        for (var i = 0; i < this.graphs.length; i++) {

            data = this.get_max_base_affected(this.regions_of_interest[i], this.regions_of_interest[i].split_context.affected);
            this.graphs[i].max.total = data.total;

            var data = get_max_graph_affected(i);
            this.graphs[i].max.y = data.y;
            this.graphs[i].max.y = data.x;

        }
    },

    do_linear_regression: function(index, _num_days) {

        var _lin_reg_sumx = 0;
        var _lin_reg_sumx2 = 0;
        var _lin_reg_sumy = 0;
        var _lin_reg_sumxy = 0;
        var ret_value = {slope: 0, y_intercept: 0};
        var run_length = _num_days;

        var _context = this.regions_of_interest[index].columns.affected_column;
        // var _length = this.regions_of_interest[index].data.length
        var _length = this.run;
        var _start = _length - _num_days;
        

          for (var i = _start; i < _length; i++) {
            var _data_var = this.regions_of_interest[index].data[i][_context]

            _lin_reg_sumx = _lin_reg_sumx + i;
            _lin_reg_sumx2 = _lin_reg_sumx2 + i * i;
            _lin_reg_sumy = _lin_reg_sumy + _data_var;
            _lin_reg_sumxy = _lin_reg_sumxy + i * _data_var;
            
          }
          ret_value.slope = (run_length * _lin_reg_sumxy - _lin_reg_sumx * _lin_reg_sumy) / (run_length * _lin_reg_sumx2 - _lin_reg_sumx * _lin_reg_sumx)
          ret_value.y_intercept = (_lin_reg_sumy - ret_value.slope * _lin_reg_sumx) / run_length
          return ret_value;
    },

    add_top_regions: function(_num_regions, _num_days, _style){
        var _context = this.get_context();
        var _region_list = [];
        var _prev_region = "";
        var _check_region = "";
        var _affected_column = this.affected_data[_context].columns.affected_column;
        var _region_name_column = this.affected_data[_context].columns.region_column;
        var _data = this.affected_data[_context].data;
        var _total = 0;

        var _lin_reg_sumx = 0;
        var _lin_reg_sumx2 = 0;
        var _lin_reg_sumy = 0;
        var _lin_reg_sumxy = 0;
        var _y_intercept = 0;
         
        if (this.run < 1) this.run = 1;

        if (_num_days > this.run) _num_days = this.run;
        else if (_num_days < 1) _num_days = 1;
        if (_num_regions > this.affected_data[this.get_context()].region_list.length) _num_regions = this.affected_data[this.get_context()].region_list.length;
        else if (_num_regions < 1) _num_regions = 1;

        var run_length = _num_days;
        var start = this.run - _num_days;
        var new_region = true;
        var section_offset = 0;

        for (var i = start; i < _data.length; i++) {
 
            _check_region = _data[i][_region_name_column];

            if (new_region) {
                _prev_region = _check_region;
                new_region = false;
            }

            //Sum region totals:
            if (_check_region == _prev_region) {
                if (_style == "Fastest Rising") {
                    var i2 = i - (section_offset * this.run) + 1;
                    var _data_var = _data[i][_affected_column];
                    _lin_reg_sumx = _lin_reg_sumx + i2;
                    _lin_reg_sumx2 = _lin_reg_sumx2 + i2 * i2;
                    _lin_reg_sumy = _lin_reg_sumy + _data_var;
                    _lin_reg_sumxy = _lin_reg_sumxy + i2 * _data_var;
                }
                _total += _data[i][_affected_column];
            }
            else {
                _slope = (run_length * _lin_reg_sumxy - _lin_reg_sumx * _lin_reg_sumy) / (run_length * _lin_reg_sumx2 - _lin_reg_sumx * _lin_reg_sumx)
                _y_intercept = (_lin_reg_sumy - _slope * _lin_reg_sumx) / run_length
                _region_list.push({ region:_data[i-1][_region_name_column],
                                    total:_total,
                                    slope: _slope,
                                    y_intercept: _y_intercept
                                });
                _total = 0;

                _lin_reg_sumx = 0;
                _lin_reg_sumx2 = 0;
                _lin_reg_sumy = 0;
                _lin_reg_sumxy = 0;
                

                i += start-1; //skip ahead by days 
                new_region = true;
                section_offset ++;
            }
 
            _prev_region = _check_region;
        }
        
        //Last region in list (e.g. Wyoming) (confirmed 11/23/2020)
        _region_list.push({ region: _data[_data.length-1][_region_name_column],
                            total: _total,
                            slope: _slope,
                            y_intercept: _y_intercept
                        });
        if (_style == "Fastest Rising") _region_list.sort(function(a, b) {return b.slope - a.slope;}); //sort by descending slope
        else _region_list.sort(function(a, b) {return b.total - a.total;}); //sort by descending total

        var _full_list = _region_list;
        _region_list = _region_list.slice(0, _num_regions);
        // inform(_full_list, _region_list);

        for (var i = 0; i < _region_list.length; i++) {
            var try_region = this.create_region_of_interest(this.regions_of_interest, _region_list[i].region, _context, false);
            if (try_region != -1) {
                this.add_region_to_graph(this.regions_of_interest, -1, _context);
            }
        }


        this.arrange_region_labels();
        
        //Log full list to textarea
        var context_str = new this.header_obj(_context);


        if (_style == "Fastest Rising") var str = "Across last " + _num_days + " days:\n" + "List of fastest rising regions sorted by linear regression slope for (" + context_str.affected_column + ")\n\n";
        else var str = "Across last " + _num_days + " days:\n" + "List of region totals as % of respective state/country total population sorted by (" + context_str.affected_column + ")\n\n";

        for (var i = 0; i < _full_list.length; i++) {
            // if (_style == "Fastest Rising") str = str + (i + 1) + '. ' + _full_list[i].region + ': y = (' + Number.parseFloat(_full_list[i].slope).toPrecision(5) +')x + ' + Number.parseFloat(_full_list[i].y_intercept).toPrecision(5) + '\n';
            if (_style == "Fastest Rising") str = str + (i + 1) + '. ' + _full_list[i].region + ' ' + Number.parseFloat(_full_list[i].slope).toPrecision(5) + '\n';
            else str = str + (i + 1) + '. ' + _full_list[i].region + ' ' + Number.parseFloat(_full_list[i].total).toPrecision(5) + '%\n';
        }

        var divider_str = "\n*****************************\n\n*****************************\n";
        $('#console').val(str + divider_str + $('#console').val());

        // inform(this.graphs);
        return _region_list;
    },

    set_text_objects_ontop: function(){ //need to add to init ! un-used 11/27/2020
        
        for (var i = 0; i < x; i++) {
            this.graphs.graph_region_label_obj.layer
        }
    },

    
    update_region_label: function(index) {
        var _selected_graph_region = this.graphs[index];
        var max_affected = this.get_max_graph_affected(index);
        _selected_graph_region.graph_region_label_obj.setCoords(max_affected.x,max_affected.y);
        
    },

    update_arrow_peak: function(index) {
        var _selected_graph_region = this.graphs[index];
        var max_affected = this.get_max_graph_affected(index);
        var fill_offset = this.filled_graphs == true ? -1 : 0;                               
        _selected_graph_region.graph_arrow_obj.point2.setPosition(JXG.COORDS_BY_USER, [max_affected.x+fill_offset, max_affected.y]);
        
    },

    //Actual algorithm that applies the rolling average to data
    transform_range: function(data, breadth) {
        var range = [];
        var parent_result_array = []

        //Inline function to account for rangle limitations at beginning and end of array
        function average_across_range(data, x, breadth) {
            breadth = Math.floor(breadth / 2);
            var start = x - breadth;
            var end = x + breadth;
            
            if (start < 0) { 
                x_left_divisor = x;
                start = 0;
            }
            else x_left_divisor = breadth

            if (end > data.length) {
                x_right_divisor = data.length - x;
                end = data.length;
            }
            else x_right_divisor = breadth
           
            var total = 0;
            for (var i = start; i < end; i++)
                total += data[i];

            return total / (x_left_divisor + x_right_divisor); 
        }
    
        for (var i = 0; i < data.length; i++) {
            range = average_across_range(data, i, breadth);
            parent_result_array.push(range);
        }
        return parent_result_array;
    },

    //Helper function for particular graph data resetting to regions_of_interest and calls transform_range to apply rolling average
    apply_rolling_average: function(_data, index) {
            this.remove_tidy_endpoints(this.graphs[index].graph_data_obj)
            this.graphs[index].graph_data_obj.dataX = [...Array(_data.data.length).keys()];
            this.graphs[index].graph_data_obj.dataY = this.extract_affected(_data.data, _data.columns.affected_column); //we need to extract data before next line
            this.graphs[index].graph_data_obj.dataY = this.transform_range(this.graphs[index].graph_data_obj.dataY, this.rolling_day_value);
            this.add_tidy_endpoints(this.graphs[index].graph_data_obj);
    },

    //Return affected people (deaths or cases data) 
    extract_affected: function(data, column) {
        var y = [];

        for (var i = 0; i < data.length; i++) {
            y.push(data[i][column]);
        }
        return y;
    },

    //Globally updates rolling average changes after a change
    update_rolling_average: function(_data, changed) {
        
        if (this.rolling_day_average_enabled) {
            for (var i = 0; i < this.graphs.length; i++) {
                if (this.graphs[i].rolling_day_avg != this.rolling_day_value || changed) {
                    this.apply_rolling_average(_data[i], i);
                    this.graphs[i].rolling_day_avg = this.rolling_day_value;
                    // this.update_region_label(i);
                    this.update_arrow_peak(i);
                }
            }
        }
        else {
            for (var i = 0; i < this.graphs.length; i++) {
                if (this.graphs[i].rolling_day_avg != this.rolling_day_value || changed) {

                    this.graphs[i].graph_data_obj.dataX = [...Array(this.graphs[i].graph_data_obj.dataX.length).keys()];
                    this.graphs[i].graph_data_obj.dataY = this.extract_affected(this.regions_of_interest[i].data, this.regions_of_interest[i].columns.affected_column);
                    this.add_tidy_endpoints(this.graphs[i].graph_data_obj);
                    this.graphs[i].rolling_day_avg = this.rolling_day_value;
                    this.update_arrow_peak(i);
                    // this.update_region_label(i);

                }
            }
        }


        this.update();
    },

    //Wrapper for board update so we can adjust axes
    update: function() {
        // if (this.x_axis_style != 'dates')
        this.update_axes();
        this.board.update();
    },

    //This function is just to make the fillcolor look correct/good
    add_tidy_endpoints: function(graph) {
        if (!this.filled_graphs) {
            graph.fillColor = 'none';
            return; //If checkbox unchecked return
        }
        graph.filled = this.filled_graphs;
        graph.dataX.splice(0, 0, 0); //insert 0 x & value at start of array
        graph.dataY.splice(0, 0, 0); 
        graph.dataX.push(graph.dataX.length-2); //append a duplicate x value and a 0 y value at the end of our data 
        graph.dataY.push(0);
        // return graph;       
    },

    //This function is to remove the added tidy points
    remove_tidy_endpoints: function(graph) {
        if (!graph.filled) return; //if graph doesn't have endpoints return
        graph.dataX.rem(0);
        graph.dataX.rem(-1); 
        graph.dataY.rem(0);
        graph.dataY.rem(-1); 
        // return graph;       
    },

    fill_regions_dropdown: function(_data) {
        "use strict";
        var dropdown = $('#regions_dropdown');

        if (isString(_data) == false) {
            $.each(_data, function(val, text) {
                dropdown.append($('<option></option>').val(val).html(text));
            });
        }
        else  dropdown.append($('<option></option>').val(_data).html(_data));
    },

    //Get a list of unique regions
    find_unique_regions: function(_region, _column_name) {
            //Data structure of     affected_data:[]
        "use strict";
        var _data = _region;
        var _region_list = [];
        var _last_region = "";
        var _check_region = "";
        for (var i = 1; i < _data.length; i++) { //start at one to skip header
            _check_region = _data[i][_column_name];

            if (_check_region == _last_region) continue; //non-unique region
            _region_list.push(_check_region); //unique region
            _last_region = _check_region;
        }
        return _region_list;         
    },

    
   //Generates the time series for a specific region in parent scope: regions_of_interest then returns the index for it
   create_region_of_interest: function(_parent_array, _region, context, ignore_duplicates) {
    "use strict";

    // var context = this.get_context();
    var _parent_data = this.affected_data[context];
    // this.fill_regions_dropdown(_parent_data.region_list);
    var _region_column = _parent_data.columns.region_column;
    var _affected_column = _parent_data.columns.affected_column;
    var _data = this.affected_data[context].data;
    
    var data_buffer = [];


    var _check_region = "";
    var already_alerted = false;
    for (var i = 0; i < _data.length; i++) { //no header
        // _check_region = _data[i]['Province_State'];
        _check_region = _data[i][_region_column];

        if (_check_region != _region) continue; //skip unmatching regions
        if (_data[i][_affected_column] == -1) {
            if (!already_alerted) {
                // alert("Dataset for region:" +_data[i]['Province_State'] + " incomplete at index:" + i)
                alert("Dataset for region:" +_data[i][_region_column] + " incomplete at index:" + i)
                already_alerted = true;
            }
            return -1
        }
        // if ("region" in _parent_array[0]) { //check if region key exists in our target array
        // if (Array.isArray(_parent_array)) {
            if (_parent_array.length > 0) {

            if (!ignore_duplicates && this.duplicate_graph_check(_region, context)) {
                inform('duplicate found:', _region);
                return -1;
            }
        }

        
        data_buffer.push(_data[i]);
    
    }

    this.push_region_obj(_parent_array, context, data_buffer, _region);

    return;
   },
   
    
    get_max_base_affected: function(_dataset, column_name) {

        result_point = new this.point(0, 0);
        

        _data = _dataset;
        _total = 0;

        // for (var i = 0; i < _data.data.length; i++) {
        for (var i = 0; i < this.run; i++) {

            if (_data.data[i][column_name] > result_point.y){
                result_point.x = i;
                result_point.y = _data.data[i][column_name];
            }

            if (i >= _data.data.length - this.days) _total += _data.data[i][column_name];
            
        }
        result_point.total = _total; //add .total to our return value
        return result_point;
        //return this.regions_of_interest[_dataset_index].reduce((max, p) => p[column_name] > max ? p[column_name] : max, this.regions_of_interest[_dataset_index][column_name]);
    },

    get_max_graph_affected: function(index) {
          result_point = new this.point(0, 0);
        //   _total = 0; //Dont need totals of graph data with rolling avg applied

          for (var i = 0; i < this.graphs[index].graph_data_obj.dataX.length; i++) {
              if (this.graphs[index].graph_data_obj.dataY[i] > result_point.y){
                  result_point.x = i;
                  result_point.y = this.graphs[index].graph_data_obj.dataY[i];
                //   if (i > this.graphs[index].graph_data_obj.dataX.length - this.days) _total += result.point.y;
              }
          }
        //   result_point.total = _total;
          return result_point;

    },


    //give methods knowledge of their namespace
    init : function() {
        "use strict";
        // this.affected_data_template.parent = this;
        // this.header_obj.parent = this;
        // this.fill_regions_dropdown.parent = this;
        // this.process_data.parent = this;
        // this.find_unique_regions.parent = this;
        // this.create_region_of_interest.parent = this;
        // this.get_context.parent = this;
        // this.set_context.parent = this;
        // this.get_max_base_affected.parent = this;
        // this.get_max_graph_affected.parent = this;
        // this.initialize_graph.parent = this;
        // this.add_region_to_graph.parent = this;
        // this.update_rolling_average.parent = this;
        // this.transform_range.parent = this;
        // this.add_tidy_endpoints.parent = this;
        // this.remove_tidy_endpoints.parent = this;
        // this.extract_affected.parent = this;
        // this.apply_rolling_average.parent = this; 
        // this.point.parent = this;
        // this.update_region_label.parent = this;
        // this.remove_invalid_regions.parent = this;
        // this.add_axes.parent = this;
        // this.update.parent = this;
        // this.update_axes.parent = this;
        // this.interpret_context.parent = this;
        // this.browser_context_template.parent = this;
        // this.add_top_regions.parent = this;
        // this.clear_all.parent = this;
        // this.clip_bounding_box_by_graph.parent = this;
        // this.push_region_obj.parent = this;
        // this.update_arrow_peak.parent = this;
        // this.arrange_region_labels.parent = this;
        // this.duplicate_graph_check.parent = this;
        // this.alt_x_axis.parent = this;
        // this.remove_top_regions.parent = this;
        // this.find_my_index.parent = this;
        // this.recalculate_peaks_totals.parent = this;
        // this.do_linear_regression.parent = this;
        // this.remove_graph.parent = this;
        // this.graph_status_obj.parent = this;

        delete this.init;
        return this;
    }

}.init()



//Main function, used for creating things like event handlers and loading our "namespace"
$(document).ready(function() {
    "use strict";


    // Used for things like window.resize
    var _date_timer = new Date();
    var waitForFinalEvent = (function () {
        var timers = {};
        return function (callback, ms, uniqueId) {
            if (!uniqueId) {
            uniqueId = "Don't call this twice without a uniqueId";
            }
            if (timers[uniqueId]) {
            clearTimeout (timers[uniqueId]);
            }
            timers[uniqueId] = setTimeout(callback, ms);
    };
    })();

    //Read page values and assign them to the respective namespace variables
    COVID_SANDBOX_NS.rolling_day_average_enabled = document.getElementById('sevendayavg').checked
    COVID_SANDBOX_NS.filled_graphs = document.getElementById('filled_graphs_checkbox').checked
    COVID_SANDBOX_NS.rolling_day_value = $('#rolling_days').val();
    COVID_SANDBOX_NS.days = $('#top_regions_days').val();
    COVID_SANDBOX_NS.ranking = $( "#ranking_dropdown option:selected" ).text();

    //Radio button status get:
    if ($("#region_context_us").is(":checked") == true) { //<- needs tidying up
        COVID_SANDBOX_NS.region_context = "US";
    }
    else {
        COVID_SANDBOX_NS.region_context = "Global";
    }

    if ($("#affected_context_cases").is(":checked") == true) {

        COVID_SANDBOX_NS.affected_context = "Cases";
    }
    else {
        COVID_SANDBOX_NS.affected_context = "Deaths";
    }
    //Jstree:
    // $(function () { $('#jstree').jstree(); });

    //Load Data
    if (GOOGLE_DRIVE_DATA) {
        $.ajax({
            type: "GET",
            url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmW7FaQhyVhJ2Zai8qRGayTdB6BkVpq3pww4ZbBEnc4bjDxYOD58tdnov3GF36R1r8rj9r8g8QYhlW/pub?output=csv",
            dataType: "text",
            success: function(data) {
                // this.affected_data = this.affected_data.sort(sortFunction);
                COVID_SANDBOX_NS.process_data("", $.csv.toObjects(data));
                COVID_SANDBOX_NS.initialize_graph();
                
            }
            });
    }
    else {
        COVID_SANDBOX_NS.process_data("covid19_deaths_US_rate", covid19_deaths_US_rate);
        COVID_SANDBOX_NS.process_data("covid19_confirmed_US_rate", covid19_confirmed_US_rate);
        COVID_SANDBOX_NS.process_data("covid19_deaths_global_rate", covid19_deaths_global_rate);
        COVID_SANDBOX_NS.process_data("covid19_confirmed_global_rate", covid19_confirmed_global_rate);
        COVID_SANDBOX_NS.process_data("spanish_flu_conversion", spanish_flu_conversion);

        COVID_SANDBOX_NS.set_context("US", "Cases");
        COVID_SANDBOX_NS.initialize_graph();
        inform(COVID_SANDBOX_NS.affected_data["covid19_deaths_US_rate"]);
        var _context = "covid19_deaths_US_rate"
        var _parent_data = COVID_SANDBOX_NS.affected_data[_context];
        COVID_SANDBOX_NS.last_updated_date = _parent_data.data[_parent_data.data.length-1][_parent_data.columns.date_column];
        // location.reload(true);
        var current_date = new Date();
        var yesterday = new Date(current_date.getTime() - 1000*60*60*24);
        var data_date = new Date(COVID_SANDBOX_NS.last_updated_date);
        if (yesterday.getMonth() != data_date.getMonth() || yesterday.getDate() != data_date.getDate()) {
            alert("The data appears to be older than yesterday, perhaps server data has not been updated, yet!");
            // var return_val = window.confirm("The data appears to be older than one day, attempt reload? *Note this may be because I have not updated the datafiles, yet.")
            // if (return_val) location.reload(true);
        }
            
        
        // $('#last_updated').after(COVID_SANDBOX_NS.last_updated_date)
        var span_start = "<span class=\"small-text-border\">";
        var span_end = "</span>";
        $('#last_updated').append(span_start + COVID_SANDBOX_NS.last_updated_date + span_end + ", Number of Days since 1/22/20: " + span_start + COVID_SANDBOX_NS.max_date + span_end);
    }

    //Event handler for region radio buttons (US/Global)
    $('input[type=radio][name=region_context]').change(function () {
        "use strict";
        // COVID_SANDBOX_NS.region_context = $("#region_context input[type='radio']:checked").val();
        COVID_SANDBOX_NS.region_context = this.value;
        inform(COVID_SANDBOX_NS.region_context + " is now selected.");
        $('#regions_dropdown').empty();
        COVID_SANDBOX_NS.fill_regions_dropdown("-- Select --");
        COVID_SANDBOX_NS.fill_regions_dropdown(COVID_SANDBOX_NS.affected_data[COVID_SANDBOX_NS.get_context()].region_list);
    });

    //Event handler for 'affected' radio buttons (cases/deaths)
    $('input[type=radio][name=affected_context]').change(function () {
        "use strict";
        COVID_SANDBOX_NS.affected_context = this.value;
        inform(COVID_SANDBOX_NS.affected_context + " is now selected.");
        $("#regions_dropdown").val("-- Select --");
    });


    //Event handler for Region dropdown
    $('#regions_dropdown').change(function () {
        "use strict";
        var highlighted = $( "#regions_dropdown option:selected" ).text();
        inform(highlighted);
        if (highlighted == "-- Select --" || highlighted === undefined ) return;
        var _context =  COVID_SANDBOX_NS.get_context();
        var try_region = COVID_SANDBOX_NS.create_region_of_interest(COVID_SANDBOX_NS.regions_of_interest, highlighted, _context, false);
        if (try_region != -1) {
            // inform(COVID_SANDBOX_NS.regions_of_interest);
            COVID_SANDBOX_NS.add_region_to_graph(COVID_SANDBOX_NS.regions_of_interest, -1, _context);
        }
    });
    
    //Event handler for ranking dropdown Peak / Total / Slope change 
    $('#ranking_dropdown').change(function () {
        "use strict";
        var highlighted = $( "#ranking_dropdown option:selected" ).text();
        // inform(highlighted);
        // if (highlighted > COVID_SANDBOX_NS.max_date) highlighted = COVID_SANDBOX_NS.max_date;
        // else if (highlighted < 1) highlighted = 1;
        COVID_SANDBOX_NS.ranking = highlighted;
    });

    $('#slope_dropdown').change(function () {
        "use strict";
        var highlighted = $( "#ranking_dropdown option:selected" ).text();
        // inform(highlighted);
        // if (highlighted > COVID_SANDBOX_NS.max_date) highlighted = COVID_SANDBOX_NS.max_date;
        // else if (highlighted < 1) highlighted = 1;
        COVID_SANDBOX_NS.ranking = highlighted;
    });

    //Event handler for Rolling Average Checkbox
    $('#sevendayavg').change(function () {
        "use strict";
        if ($(this).is(':checked')) {
            inform($(this).val() + ' is now checked');
            COVID_SANDBOX_NS.rolling_day_average_enabled = true;
            COVID_SANDBOX_NS.update_rolling_average(COVID_SANDBOX_NS.regions_of_interest, true);
        } else {
            inform($(this).val() + ' is now unchecked');
            COVID_SANDBOX_NS.rolling_day_average_enabled = false;
            COVID_SANDBOX_NS.update_rolling_average(COVID_SANDBOX_NS.regions_of_interest, true);
        }
    }); 
    
    //Event handler for filled graphs checkbox
    $('#filled_graphs_checkbox').change(function () {
        "use strict";
        if ($(this).is(':checked')) {
            inform($(this).val() + ' is now checked');
            COVID_SANDBOX_NS.filled_graphs = true;
            // COVID_SANDBOX_NS.update_rolling_average(COVID_SANDBOX_NS.regions_of_interest, true);
            redo_graphs();
            COVID_SANDBOX_NS.arrange_region_labels();
            // COVID_SANDBOX_NS.update();
        } else {
            inform($(this).val() + ' is now unchecked');
            COVID_SANDBOX_NS.filled_graphs = false;
            // COVID_SANDBOX_NS.update_rolling_average(COVID_SANDBOX_NS.regions_of_interest, true);
            redo_graphs();
            COVID_SANDBOX_NS.arrange_region_labels();
        }
    });

    //Pure javascript to synchronize slider and input box
    var custom_slider_range = document.getElementById('rollingavgslider');
    var avg_rolling_input = document.getElementById('rolling_days');
    
    avg_rolling_input.addEventListener('input', function (val) {
      custom_slider_range.value = val.target.value;
    });
    custom_slider_range.addEventListener('input', function (val) {
      avg_rolling_input.value = val.target.value;
    });

    
    //Pure javascript to synchronize slope dropdown to arrange dropdowns
    var slope_selection = document.getElementById('slope_dropdown');
    var arrange_selection = document.getElementById('ranking_dropdown');
    
    slope_selection.addEventListener('input', function (val) {
        var _val = val.target.value;
        if (_val == "Highest") arrange_selection.value = "Total";
        else if (_val == "Fastest Rising") arrange_selection.value = "Slope";
    });
    // arrange_selection.addEventListener('input', function (val) {
    //     slope_selection.value = val.target.value;
    // });
     

    //Event handler for Rolling Average Input Box
    $("#rolling_days").keyup(function() {
        "use strict";
       
        check_for_avg_change();
    });

    //Event handler for Rolling Average Slider
    $("#rollingavgslider").change(function() {
        "use strict";
        var val = $('#rollingavgslider').val(); //Get

        check_for_avg_change();
    });

    //Event handler for UK Spanish Flu button
    $('#uk_spanish_flu_button').click(function() {
        "use strict";
        var prior_context = {region: COVID_SANDBOX_NS.region_context, affected: COVID_SANDBOX_NS.affected_context}
        //= COVID_SANDBOX_NS.interpret_context(COVID_SANDBOX_NS.get_context());
        inform (prior_context);
        COVID_SANDBOX_NS.set_context("Global", "Deaths");
        var try_region = COVID_SANDBOX_NS.create_region_of_interest(COVID_SANDBOX_NS.regions_of_interest, "United Kingdom Spanish Flu 1918", COVID_SANDBOX_NS.uk_spanish_flu_deaths, false);
        if (try_region != -1) {
            COVID_SANDBOX_NS.add_region_to_graph(COVID_SANDBOX_NS.regions_of_interest, -1, COVID_SANDBOX_NS.uk_spanish_flu_deaths);
        }
        COVID_SANDBOX_NS.set_context(prior_context.region, prior_context.affected);

        // COVID_SANDBOX_NS.clip_bounding_box_by_graph(); 
        // COVID_SANDBOX_NS.arrange_region_labels(-1);
        // Update regions dropdown:
        $('#regions_dropdown').empty();
        COVID_SANDBOX_NS.fill_regions_dropdown("-- Select --");
        COVID_SANDBOX_NS.fill_regions_dropdown(COVID_SANDBOX_NS.affected_data[COVID_SANDBOX_NS.get_context()].region_list);
    });

    //Event handler for when days changes
    $('#top_regions_days').change(function() {
        COVID_SANDBOX_NS.days = $('#top_regions_days').val();
    });
    

    //Event handler for top regions add button
    $('#hide_button').click(function() {
        "use strict";
        COVID_SANDBOX_NS.remove_graph($( "#regions_dropdown option:selected" ).text());
        // COVID_SANDBOX_NS.clip_bounding_box_by_graph(); 
        COVID_SANDBOX_NS.arrange_region_labels();
        $('#regions_dropdown').empty();
        COVID_SANDBOX_NS.fill_regions_dropdown("-- Select --");
        COVID_SANDBOX_NS.fill_regions_dropdown(COVID_SANDBOX_NS.affected_data[COVID_SANDBOX_NS.get_context()].region_list);
    });


    //Event handler for top regions add button
    $('#add_top_regions_button').click(function() {
        "use strict";
        COVID_SANDBOX_NS.add_top_regions($('#top_regions').val(), $('#top_regions_days').val(),$( "#slope_dropdown option:selected" ).text());
        // COVID_SANDBOX_NS.clip_bounding_box_by_graph(); 
        // COVID_SANDBOX_NS.arrange_region_labels();
    });

    //Event handler for top regions remove button
    $('#remove_top_regions_button').click(function() {
        "use strict";
        COVID_SANDBOX_NS.remove_top_regions($('#top_regions').val(), $('#top_regions_days').val());
        // COVID_SANDBOX_NS.clip_bounding_box_by_graph(); 
        // COVID_SANDBOX_NS.arrange_region_labels(-1);
    });

    //Event handler for reframe (both) button
    $('#reframe_button').click(function() {
        COVID_SANDBOX_NS.clip_bounding_box_by_graph(); 
        COVID_SANDBOX_NS.arrange_region_labels();
    });

    
    //Event handler for clear button
    $('#clear_button').click(function() {
        "use strict";
        COVID_SANDBOX_NS.clear_all(true);
        COVID_SANDBOX_NS.initialize_graph(); //browser context is changed in function <-

        $('#regions_dropdown').empty();
        COVID_SANDBOX_NS.fill_regions_dropdown("-- Select --");
        COVID_SANDBOX_NS.fill_regions_dropdown(COVID_SANDBOX_NS.affected_data[COVID_SANDBOX_NS.get_context()].region_list);
    });

    //Event handler for arrange button
    $('#arrange_button').click(function() {
        "use strict";
        COVID_SANDBOX_NS.arrange_region_labels();
    });


    //Event handler for clip bounding box
    $('#clip_bound_button').click(function() {
        "use strict";
        COVID_SANDBOX_NS.clip_bounding_box_by_graph(); 
    });

    //Event for window size change:
    $( window ).resize(function() {
        // var window_size = $(window).innerWidth;
        var window_size = document.body.clientWidth;;
        // inform(window_size);
        waitForFinalEvent(function(){
            if (Math.abs(window_size - COVID_SANDBOX_NS.viewport_width) < 50) {

                COVID_SANDBOX_NS.hold_resize = false;
                return;
            }
            // inform(window_size, COVID_SANDBOX_NS.viewport_width);
            if (COVID_SANDBOX_NS.hold_resize) return;
            COVID_SANDBOX_NS.hold_resize = true;

            COVID_SANDBOX_NS.viewport_width = window_size;
    
            redo_graphs();

            COVID_SANDBOX_NS.clip_bounding_box_by_graph(); 
            COVID_SANDBOX_NS.arrange_region_labels();
            
            COVID_SANDBOX_NS.hold_resize = false;
          }, 500, "Graph update" + _date_timer.getTime());
       
      });

    
    function redo_graphs() {
        var _region_list = COVID_SANDBOX_NS.regions_of_interest;
        var buffer = [];
        for (var i = 0; i< _region_list.length; i++) { //buffer the regions
            var try_region = COVID_SANDBOX_NS.create_region_of_interest(buffer, _region_list[i].region, _region_list[i].context, true)
        }
        // inform(buffer);
        COVID_SANDBOX_NS.clear_all(false);
        COVID_SANDBOX_NS.initialize_graph(); //browser context is changed in function <-
        // inform(buffer);
        // var num = buffer.length;
        // if (num > 35) {
        //     num = 10;
        // }
        COVID_SANDBOX_NS.regions_of_interest = buffer;
        for (var i = 0; i < COVID_SANDBOX_NS.regions_of_interest.length; i++) {
            // COVID_SANDBOX_NS.create_region_of_interest(COVID_SANDBOX_NS.regions_of_interest, buffer[i].region, buffer[i].context)
            COVID_SANDBOX_NS.add_region_to_graph(COVID_SANDBOX_NS.regions_of_interest, i, COVID_SANDBOX_NS.regions_of_interest[i].context);
        }
    }

    //Timer for rolling day avg input box check
    function check_for_avg_change() {
        "use strict";

        var val = $('#rolling_days').val(); //Get
        // var val2 = $('#rollingavgslider').val(); //Get
        var checked = $('#sevendayavg').is(':checked');

        if (val == COVID_SANDBOX_NS.last_rolling_val && checked == COVID_SANDBOX_NS.last_rolling_bool) return; //Nothing has actually changed so return


        if (val < 3) val = 3; //Rolling averages only make sense when they're above 1...
        if (val % 2 == 0) {   //...and odd
            inform("The rolling day average must be odd.");
            val --;
            $('#rolling_days').val(val) //Set
        }

        COVID_SANDBOX_NS.rolling_day_value = val;
        COVID_SANDBOX_NS.update_rolling_average(COVID_SANDBOX_NS.regions_of_interest, true);

        COVID_SANDBOX_NS.last_rolling_val = val;
        // this.last_val2 = val;
        COVID_SANDBOX_NS.last_rolling_bool = checked;
        inform(COVID_SANDBOX_NS.board);
    }
    // setInterval(check_for_avg_change, 1000);

});




