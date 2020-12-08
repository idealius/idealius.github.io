

// JXG.Options.text.display = 'internal'; //needed for text to work on webkit / firefox

JXG.Options.text.cssClass = '';
JXG.Options.cssDefaultStyle = '';



var board = JXG.JSXGraph.initBoard('jsxgbox', {
    boundingbox: [0,10,10,0],
    //keepaspectratio: true,
    showcopyright: false,
    axis: true,
    renderer: 'canvas',
    defaultAxes: {
        x: {
            strokeColor: 'grey',
            ticks: {
                visible: 'inherit',
            }
        },
        y: {
            strokeColor: 'grey',
            ticks: {
                visible: 'inherit',
            }
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
        needTwoFingers: true,
        needShift: false
    },

    showZoom: false,
    showNavigation: false
});

var x = 3;
var y = 3;
var my_color = 'black';

var graph = board.create('curve', [x,y], {
    strokeColor:my_color,
    fillColor:my_color, 
    fillOpacity:.5, 
    name:"curve", 
    strokeWidth:1.5,
    fixed: true
    // dragToTopOfLayer: true
});

var txt = board.create('text', [3,4, " <span id='par'>(</span> Hello world <span id='par'>)</span>"], 
  {
    cssClass: 'myFont', 
    highlightCssClass: 'myFont',
    strokeColor: 'red',
    highlightStrokeColor: 'blue',
    fontSize:20
  });
  
board.update();

