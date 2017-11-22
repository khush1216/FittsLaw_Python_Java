var TIME_MAX_POS = 2000;

var throughputDatam = [];
var timeAndIndexDiffDatum = [];

var plusregressionCoeff = [];

var initialDim = checkNewDim(620, 400, 30, 30, 30, 30);

var dimesnsionsForPlot = checkNewDim(540, 300, 30, 30, 30, 50);

var mainMethodFitts = {
	target: {x: 0, y: 0, r: 10},
	start: {x: 0, y: 0, t: 0},
	last: {},

	posits: [],
	postCurr: 0,
	tabCurrentCounter: 0,
	
	newMissElement: 0,
	upperLowerLimits: {minD: 120, maxD: 300, minW:10 , maxW: 100},
	allParametersObject: {num: 15, distance: 200, width: 20, randomize: false},

	pathPoints: [],
	active: false,

	data: [],
	storeCurrDataSet: 0,
	countData: 0,

	colour: d3.scale.category10(),

	findFinalNextPointer: function() {
		this.target = this.posits[this.postCurr];
		this.target.distance = this.allParametersObject.distance;
		this.postCurr = (this.postCurr + Math.ceil(this.posits.length/2)) % this.posits.length;

		var target = testAreaSVG.selectAll('#target').data([this.target]);

		var insert = function(d) {
			d.attr('cx', function(d) { return d.x; })
			.attr('cy', function(d) { return d.y; })
			.attr('r', function(d) { return d.w / 2; });
		}

		target.enter()
			.append('circle')
				.attr('id', 'target')
				.style('fill', '#FF69B4')
				.call(insert);

		target.transition()
				.call(insert);


		this.active = true;
	},

	retouchAllCircles: function() {
		this.tabCurrentCounter = 0;

		this.generateISOPositions(this.allParametersObject.num,
			this.allParametersObject.distance,
			this.allParametersObject.width);

		var circles = testAreaSVG.selectAll('circle').data(this.posits);

		var insert = function(d) {
			d.attr('cx', function(d) { return d.x; })
			.attr('cy', function(d) { return d.y; })
			.attr('r', function(d) { return d.w / 2; });
		}

		circles.enter()
			.append('circle')
				.attr('class', 'iso')
				.call(insert);

		circles.transition()
			.call(insert);

		circles.exit()
			.transition()
				.attr('r', 0)
				.remove();

		this.postCurr = 0;
		this.findFinalNextPointer();
		this.active = false;
},

	generateISOPositions: function(num, d, w) {

		this.posits = [];

		for (var i = 0; i < num; i++) {
			this.posits[i] = {x: initialDim.cx + ((d/2) * Math.cos((2 * Math.PI * i) / num)),
				y: initialDim.cy + ((d/2) * Math.sin((2 * Math.PI * i) / num)),
				w: w};
		}
	},

	removeTarget: function() {
		testAreaSVG.selectAll('#target').data([])
			.exit()
				.remove();

		this.active = false;
		this.pathPoints = [];
	},

	mouseClicked: function(x, y) {

		if (distance({x: x, y: y}, this.target) < (this.target.w / 2)) {
			this.addDataPoint({start: this.start,
							   target: this.target,
							   path: this.pathPoints,
							   hit: {x: x, y: y, t: (new Date).getTime()}});
			this.removeTarget();

			if (this.allParametersObject.randomize && this.tabCurrentCounter >= this.posits.length) {
				this.tabCurrentCounter = 0;
				this.postCurr = 0;
				this.newMissElement = 0;
				this.retouchAllCircles;
				this.findFinalNextPointer();
				this.active = false;
			}
			else {
				this.tabCurrentCounter++;
				this.findFinalNextPointer();
			}


			this.last = {x: x, y: y, t: (new Date).getTime()};
			this.start = this.last;
			this.pathPoints.push(this.last);
		}
		else {
			this.newMissElement++;
		}
	},

	addDataPoint: function(data) {
		if (this.active == false)
			return;

		var dt = data.hit.t - data.start.t;

		if (dt < TIME_MAX_POS)
		{
			var dist = distance(data.target, data.start);
			var id = shannon(dist, data.target.w);

			this.data[this.storeCurrDataSet].data.push({time: dt, distance: data.target.distance, width: data.target.w, hit: data.hit,
				start: data.start, target: data.target, path: data.path});
		}
	},

	addDataSet: function() {

		this.drawPlots(this);

		this.countData++;
		var num = this.countData;
		var colour = this.colour(randomAB(0, 10));

		this.data[num] = {data: [], colour: colour};

		this.storeCurrDataSet = num
		var div = d3.select('#dataSets').append('div')
			.attr('id', 'dataSet' + num)
			.text('Data Set ' + num + ' ')
			.style('background-color', 'transparent');

		var buttonID ='removeDataSet' + num;
		div.append('button')
			.attr('id', buttonID)
			.attr('type', 'button')
			.text('delete!');

		var that = this;

		$('#' + buttonID).click(function() {
			that.deleteDataSet(num);
			mainMethodFitts.active = false;
		});

		$('#dataSet' + num).click(function() {
			if (assIsKey(num, that.data)) {
				that.storeCurrDataSet = num;
			}
			mainMethodFitts.active = false;

		})
	},

	deleteDataSet: function(num) {
		if (assSize(this.data) == 1)
		{
			alert('Cannot delete data set! Create another data set first.')
		} else
		{
			d3.select('#dataSet' + num).remove();
			delete this.data[num];

			groupScatter1.selectAll('.cat' + num)
				.transition()
					.duration(500)
						.style('opacity', 0)
						.remove();

			if (num == this.storeCurrDataSet) {
				var first = parseInt(assFirstKey(this.data));
				this.storeCurrDataSet = first;
			}

			this.drawPlots(this);
		}
	},

	drawPlots: function(that) {
		that.active = false;
		
		var width1;
		var dist1;

		var indexofDifficulty;
		var dataSetIndex = -1; 
		for (var key in that.data) { 

			dataSetIndex++;

			var groups = [];
			for (var i = 0; i < that.data[key].data.length; i++) { 
				var datum = that.data[key].data[i];
				var groupID = datum.distance.toString() + datum.width.toString();
				
				width1 = datum.distance;
				dist1 = datum.width;
				
				if (!groups[groupID]) {
					groups[groupID] = [];
				}
				groups[groupID].push(datum);
			}
			
			
			var newData = [];
			for (var group in groups) {
				if (groups[group].length < 3) {
					continue;
				}
				for (var i = 0; i < groups[group].length; i++) {
					var subThroughput = [];
					var subTimeIndexDif = [];
					var datum = groups[group][i];
					var We = datum.width;
					var De = datum.distance;
					datum.IDe = shannon(De, We);
					indexofDifficulty = datum.IDe;
					datum.throughput = 1000 * (datum.IDe/datum.time);
					//store data in array for python plots
					subThroughput.push(datum.throughput, indexofDifficulty,width1,dist1);
					subTimeIndexDif.push(datum.time, indexofDifficulty, width1, dist1);
					
					timeAndIndexDiffDatum.push(subTimeIndexDif);
					throughputDatam.push(subThroughput);
					//console.log(throughputDatam);
					newData.push(datum);
					
				}
			}
				
			
			var colour = that.data[key].colour;

			var insert = function(d) {
				d.attr('cx', function(d) { return plotScatterXnew(d.IDe); })
				.attr('cy', function(d) { return plotScatterYnew(d.time); })
				.attr('r', 5);
			}

			var circles = groupScatter1.selectAll('circle.cat' + key)
				.data(newData);

			circles.enter()
				.append('circle')
					.attr('class', 'cat' + key)
					.style('fill', colour)
					.style('opacity', 0.5)
					.call(insert);

			circles.transition()
				.duration(500)
					.call(insert);

			
			var regressionCo = [];
			var covTIDe = cov(newData,
				function(d) { return d.time; },
				function(d) { return d.IDe});

			var varIDe = variance(newData, function(d) { return d.IDe; })

			if (varIDe > 0)
				var b = covTIDe / varIDe;
			else
				var b = 0;
			
			regressionCo.push(b);
			
			var mT = mean(newData, function(d) { return d.time; });
			var mIDe = indexofDifficulty;
			
			
			var a = mT - b * mIDe;

			regressionCo.push(a);
			plusregressionCoeff.push(throughputDatam,regressionCo);
			console.log(plusregressionCoeff);
			if (!isNaN(a))
			{
				var makeLine = function(d) {
					return d
						.attr('x1', 0)
						.attr('x2', dimesnsionsForPlot.innerWidth)
						.attr('y1', function(d) { return plotScatterYnew(d.y1); })
						.attr('y2', function(d) { return plotScatterYnew(d.y2); })
				}

				var regression = groupScatter1.selectAll('line.cat' + key)
					.data([{y1:a + b * 0.5, y2: a + b * 6.5}]);

				regression.enter().append('line')
					.attr('class', 'cat' + key)
					.style('stroke', colour)
					.style('stroke-width', 2)
					.call(makeLine);

				regression.transition()
					.call(makeLine);
			}
		}
	}
};

function checkNewDim(w, h, top, right, bottom, left) {
	return {width: w,
		height: h,
		innerWidth: w - (left + right),
		innerHeight: h - (top + bottom),
		top: top,
		right: right,
		bottom: bottom,
		left: left,
		cx: (w - (left + right)) / 2 + left,
		cy: (h - (top + bottom)) / 2 + top};
}


var plotScatterXnew = d3.scale.linear()
	.domain([0.5, 6.5])
	.range([0, dimesnsionsForPlot.innerWidth]);

var plotScatterYnew = d3.scale.linear()
	.domain([TIME_MAX_POS, 0])
	.range([0, dimesnsionsForPlot.innerHeight]);
	
function cov(data, extractorA, extractorB) {

	if (data.length <= 1) {
		return 0;
	}

	var mA = mean(data, extractorA);
	var mB = mean(data, extractorB);

	var cov = 0;
	for (var i = 0; i < data.length; i++) {
		cov += (extractorA(data[i]) - mA) * (extractorB(data[i]) - mB);
	}

	return cov / (data.length - 1);
}

function variance(data, extractor) {
	return cov(data, extractor, extractor);
}

function mean(data, extractor) {
	var sum = 0;
	for (var i = 0; i < data.length; i++) {
		sum += extractor(data[i]);
	}
	return sum / data.length;
}

function randomAB(a, b) {
	return a + Math.random() * (b - a);
}

function assSize(assArr) {
	var size = 0;
	for (var _ in assArr) {
		size++;
	}
	return size;
}

function assFirstKey(assArr) {
	for (var key in assArr) {
		return key;
		break;
	}
}

function assIsKey(needle, assArr) {
	for (var key in assArr) {
		if (needle == key) {
			return true;
		}
	}
	return false;
}

function project(A, B, p) {
	var AB = minus(B, A);
	var AB_squared = dot(AB, AB);
	if (AB_squared == 0) {
		return A;
	}
	else {
		var Ap = minus(p, A);
		var t = dot(Ap, AB) / AB_squared;
		return {x: A.x + t * AB.x,
				y: A.y + t * AB.y,
				t: t};
	}
}

function mouseClicked()
{
	var m = d3.svg.mouse(this);
	mainMethodFitts.mouseClicked(m[0], m[1]);
}

function dot(a, b) {
	return (a.x * b.x) + (a.y * b.y);
}

function minus(a, b) {
	return {x: a.x - b.x, y: a.y - b.y};
}

function distance(a, b) {
	var dx = a.x - b.x;
	var dy = a.y - b.y;
	return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

function shannon(A, W) {
	return Math.log(A / W + 1) / Math.log(2);
}

function bgRect(d, dim) {
	return d.append('rect')
		.attr('cx', 0)
		.attr('cy', 0)
		.attr('width', dim.width)
		.attr('height', dim.height)
		.attr('class', 'back');
}

function bgRect2(d, dim) {
	return d.append('rect')
		.attr('cx', 0)
		.attr('cy', 0)
		.attr('width', dim.width)
		.attr('height', dim.height)
		.attr('class', 'plot1IDTime');
}

var testAreaSVG = d3.select('#movePointer').append('svg')
	.attr('width', initialDim.width)
	.attr('height', initialDim.height)
	.style('pointer-events', 'all')
	.on('mousedown', mouseClicked)
	.call(bgRect, initialDim);

var scatterEffectiveSVG = d3.select('#scatterEffective').append('svg')
	.attr('width', dimesnsionsForPlot.width)
	.attr('height', dimesnsionsForPlot.height)
	.call(bgRect2, dimesnsionsForPlot);

var groupScatter1 = scatterEffectiveSVG.append('g')
	.attr('transform', 'translate('+ (dimesnsionsForPlot.left) + ',' + dimesnsionsForPlot.top + ' )');

	
var effXAxis = d3.svg.axis()
	.scale(plotScatterXnew)
	.ticks(10)
	.tickSize(6, 3, 0);

var effYAxis = d3.svg.axis()
	.scale(plotScatterYnew)
	.ticks(10)
	.tickSize(6, 3, 6)

groupScatter1.append("g")
    .attr("class", "axis")
    .call(effXAxis.tickSize(dimesnsionsForPlot.innerHeight).orient("bottom"));

groupScatter1.append("g")
    .attr("class", "axis")
    .call(effYAxis.tickSize(-dimesnsionsForPlot.innerWidth).orient("left"));

mainMethodFitts.active = false;
mainMethodFitts.generateISOPositions(15, 150, 10);
mainMethodFitts.retouchAllCircles();
mainMethodFitts.addDataSet();

$('#sliderDistance1').click(function() {
if($('#sliderDistance1').is(':checked')) { mainMethodFitts.allParametersObject.distance = 208; mainMethodFitts.retouchAllCircles(); mainMethodFitts.allParametersObject.randomize = false; }});

$('#sliderDistance2').click(function() {
if($('#sliderDistance2').is(':checked')) { mainMethodFitts.allParametersObject.distance = 250; mainMethodFitts.retouchAllCircles(); mainMethodFitts.allParametersObject.randomize = false; }});

$('#sliderDistance3').click(function() {
if($('#sliderDistance3').is(':checked')) { mainMethodFitts.allParametersObject.distance = 300; mainMethodFitts.retouchAllCircles(); mainMethodFitts.allParametersObject.randomize = false; }});

$('#widthOpt1').click(function() {
if($('#widthOpt1').is(':checked')) { mainMethodFitts.allParametersObject.width = 20; mainMethodFitts.retouchAllCircles(); mainMethodFitts.allParametersObject.randomize = false; }});

$('#widthOpt2').click(function() {
if($('#widthOpt2').is(':checked')) { mainMethodFitts.allParametersObject.width = 50; mainMethodFitts.retouchAllCircles(); mainMethodFitts.allParametersObject.randomize = false; }});


/*$('#downloadData').click(function() {
   var csvContent = '"Time","Distance","Width"\n';
            $.each(mainMethodFitts.data[mainMethodFitts.storeCurrDataSet].data,function(i, datapoint){
                csvContent += '"'+datapoint.time+'","'+datapoint.distance+'","'+datapoint.width+'"\n';
            });
            window.open("data:text/csv;charset=UTF-8,"+encodeURIComponent(csvContent));  
});*/

$('#downloadData').click(function() {
   var csvContent = '"Time","IndexOfDiff","Distance","Width"\n';
            for(var i=0;i<timeAndIndexDiffDatum.length;i++){
				
				csvContent += '"'+timeAndIndexDiffDatum[i][0]+'","'+timeAndIndexDiffDatum[i][1]+'","'+timeAndIndexDiffDatum[i][2]+'","'+timeAndIndexDiffDatum[i][3]+'"\n';
			
			}
            window.open("data:text/csv;charset=UTF-8,"+encodeURIComponent(csvContent));  
});


$('#dataForGraph2').click(function() {
   var csvContent = '"Throughput","IndexDif","Distance","Width"\n';
			for(var i=0;i<throughputDatam.length;i++){
				
				csvContent += '"'+throughputDatam[i][0]+'","'+throughputDatam[i][1]+'","'+throughputDatam[i][2]+'","'+throughputDatam[i][3]+'"\n';
			
			}
            window.open("data:text/csv;charset=UTF-8,"+encodeURIComponent(csvContent));  
});

$('#updatePlot').click(function() {	
	mainMethodFitts.drawPlots(mainMethodFitts);
	var x = document.getElementById("graphs");
    if (x.style.display === "none") {
        x.style.display = "";
    } 
	});

$('#addDataSetButton').click(function() {
	mainMethodFitts.addDataSet();
	mainMethodFitts.active = false;
});
