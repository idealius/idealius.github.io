// MIT License
// Copyright <YEAR> <COPYRIGHT HOLDER>
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

//Original code from https://github.com/jonasalmeida/fminsearch

// fminsearch=function(func,Parm0,x,y,Opt){// fun = function(x,Parm)
fminsearch=function(func, Parm0, x,y, Opt){// fun = function(x,Parm)
	// example
	//
	// x = [32,37,42,47,52,57,62,67,72,77,82,87,92];y=[749,1525,1947,2201,2380,2537,2671,2758,2803,2943,3007,2979,2992]
	// fun = function(x,P){return x.map(function(xi){return (P[0]+1/(1/(P[1]*(xi-P[2]))+1/P[3]))})}
	// Parms=jmat.fminsearch(fun,[100,30,10,5000],x,y)
	//
	// Another test:
	// x=[32,37,42,47,52,57,62,67,72,77,82,87,92];y=[0,34,59,77,99,114,121,133,146,159,165,173,170];
	//
	// Opt is an object will all other parameters, from the objective function (cost function), to the 
	// number of iterations, initial step vector and the display switch, for example
	// Parms=fminsearch(fun,[100,30,10,5000],x,y,{maxIter:10000,display:false})
	if(!Opt){Opt={}};
	if(!Opt.maxIter){Opt.maxIter=1000};
	if(!Opt.step){// initial step is 1/100 of initial value (remember not to use zero in Parm0)
		Opt.step=Parm0.map(function(p){return p/100});
		// inform(Opt.step);
		Opt.step=Opt.step.map(function(si){if(si==0){return .001}else{ return si}}); // convert null steps into 1's //Updated to .0001
	};
	if(typeof(Opt.display)=='undefined'){Opt.display=true};


	if(!Opt.objfunc) { //Cost function
		Opt.objfunc=function(y, yp) {
			return y.map( function(yi, i) {
				// inform(yp);
				// inform(yi-yp[i]);
				return Math.pow((yi - yp[i]), 2)
				}).reduce(function(a,b) {
					return a+b; //changes array into one summation value
				});
		};
	} //SSD

	var funcParm = function(P) {
		if (Opt.step_style) {
			var result = [];
			for (var i = 0; i < x.length; i++) {
				result.push(func(x[i],P));
			}
			return Opt.objfunc(y, result);
		}
		else return Opt.objfunc(y, func(x,P));
	}//function (of Parameters) to minimize

	var mean_func = function(y) {
		var total = 0
		y.forEach(element => { total += element;});
		return total / y.length;
	}


	var ss_total_func=function(y) {
		mean = mean_func(y);
		return y.map( function(yi) {
			// inform(yp);
			// inform(yi-yp[i]);
			return Math.pow((yi - mean), 2)
			}).reduce(function(a,b) {
				return a+b; //changes array into one summation value
			});
	};

	var r_squared = function(y, P) {
		return 1 - funcParm(P) / ss_total_func(y);
	}

	var adj_r_squared = function(y, P, r2) {
		var n = y.length;
		if (r2) return 1-(1-r2)*(n-1)/(n-P.length-1);
		else return 1-(1-r_squared(y,P))*(n-1)/(n-P.length-1);
	}

	
	var cloneVector=function(V){return V.map(function(v){return v})};
	var P0=cloneVector(Parm0),P1=cloneVector(Parm0);
	// inform(fun(x, P0));
	var n = P0.length;
	var step=Opt.step;

	
	
	// if (Opt.curves) inform(Opt.curves);

	// silly multi-univariate screening
	var eval_reverse = false;
	var i = 0;
	var r2 = 0;
	while(i<Opt.maxIter && ((Opt.target_r2) ? (r2 < Opt.target_r2) : true)) {


		for(var j=0;j<n;j++){ // take a step for each parameter

			P1=cloneVector(P0);
			P1[j]+=step[j];
			
			if (Opt.eval_func)
			{
				eval_reverse = Opt.eval_func(j, Opt.terms, P1);
			}
			
			// if (Opt.step_style && j % 5 == 0) { //skip certain parameters for sum regression
			//if (Opt.step_style) { //skip certain parameters for sum regression

				// inform(P1[j]);
				// var index = Math.floor(j / 4);
				// var curve = Opt.curves[index];
				// curve.Parms = [P1[j], P1[j+1], P1[j+2], P1[j+3]];
				// inform(Opt.func2(curve.x_offset, curve));
				// if (Opt.func2(curve.x_offset, curve) > 0 || Opt.func2(curve.x_offset+x.length+20, curve) > 0) {
				// 	skip = true;
				// 	// inform ("skipped");
				// }
				// skip = true;
			//}
			// if (j % 2 == 1) // Looking for Exponents based on position in P
			// {
			// 	if (Math.abs(P1[j]) > 9) { //Exponents > 9 are ridiculous throw them out
			// 		skip = true;
			// 	}
			// }
			// else {

				// inform(j,funcParm(P1),funcParm(P0));
			// }
			if(funcParm(P1)<funcParm(P0) && !eval_reverse){ // if parm value going in the right direction

				step[j]=1.2*step[j]; // then go a little faster
				P0=cloneVector(P1);
				//inform(P1);
				// console.log("getting closer");
			}
			else{
				step[j]=-(0.5*step[j]); // otherwise reverse and go slower
				// inform(j, step[j]);
				eval_reverse = false;
			}
			// inform(funcParm(P1),funParm(P0));

		}
		r2 = r_squared(y, P0);
		i++;
		if(Opt.display){if(i>(Opt.maxIter-10)){console.log(i+1,funcParm(P0),P0)}}
	}

	inform(i + " cycles.")

	if (!!document.getElementById('plot')){ // if there is then use it
		fminsearch.plot(x,y,func(x,P0),P0);
	}

	var r2 = r_squared(y, P0);
	var adj_r2 = adj_r_squared(y,P0, r2);

	var ret = {P:P0, r_squared: r2, adj_r_squared: adj_r2 };
	return ret;
};

fminsearch.load=function(src){ // script loading
	// example: fminsearch.load('http://localhost:8888/jmat/jmat.js')
	var s = document.createElement('script');
	s.src = src;
	document.head.appendChild(s);
	s.parentElement.removeChild(s);
};

fminsearch.plot=function(x,y,yp,Parms){ // ploting results using <script type="text/javascript" src="https://www.google.com/jsapi"></script>
	// create Array in Google's format
	var data = new google.visualization.DataTable();
	data.addColumn('number', 'X');
	data.addColumn('number', 'Observed');
	data.addColumn('number', 'Model fit');
	var n = x.length;
	for (var i=0;i<n;i++){
		data.addRow([x[i],y[i],yp[i]]);
	};
	//var chart = new google.visualization.ScatterChart(
	var titulo='Model fitting';
	if(!!Parms){titulo='Model parameters: '+Parms};
	var chart = new google.visualization.ComboChart(
		document.getElementById('plot'));
	    chart.draw(data, {title: titulo,
	                      width: 600, height: 400,
	                      vAxis: {title: "Y", titleTextStyle: {color: "green"}},
	                      hAxis: {title: "X", titleTextStyle: {color: "green"}},
						  seriesType: "scatter",
						  series: {1: {type: "line"}}}
	              );
}

