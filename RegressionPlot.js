define( ["qlik", "https://cdnjs.cloudflare.com/ajax/libs/d3/4.9.1/d3.min.js", "./regression", "text!./RegressionPlot.html", "css!./RegressionPlot.css"],
	function ( qlik, d3, regression, template ) {
		"use strict";
		return {
			template: template,
			initialProperties: {
				qHyperCubeDef: {
					qDimensions: [],
					qMeasures: [],
					qSuppressMissing: true,
					qInitialDataFetch: [{
						qWidth: 3,
						qHeight: 3333
					}]
				}
			},
			definition: {
				type: "items",
				component: "accordion",
				items: {
					dimensions: {
						uses: "dimensions",
						min: 1,
						max: 1
					},
					measures: {
						uses: "measures",
						min: 2,
						max: 2
					},
					sorting: {
						uses: "sorting"
					},
					settings: {
						uses: "settings",
						items: {
							regression: {
								type: "items",
								label: "Regression",
								items: {
									regressionType: {
										type: "string",
										component: "dropdown",
										label: "Regression type",
										ref: "regression.type",
										options: [
											{value: 'linear', label: 'Linear'}, 
											{value: 'exponential', label: 'Exponential'}, 
											{value: 'logarithmic', label: 'Logarithmic'}, 
											{value: 'power', label: 'Power'}, 
											{value: 'polynomial', label: 'Polynomial'}
										]
									},
									order: {
										type: "integer",
										label: "Order",
										ref: "regression.order",
										min: "2",
										defaultValue: "2",
										show: function(layout) {
											return layout.regression.type === "polynomial";
										}
									}
								}
							},
							margins: {
								type: "items",
								label: "Margins",
								items: {
									marginTop: {
										type: "integer",
										label: "Top Margin",
										ref: "margin.top",
										min: "0",
										defaultValue: "10"
									},
									marginRight: {
										type: "integer",
										label: "Right Margin",
										ref: "margin.right",
										min: "0",
										defaultValue: "10"
									},
									marginBottom: {
										type: "integer",
										label: "Bottom Margin",
										ref: "margin.bottom",
										min: "0",
										defaultValue: "20"
									},
									marginLeft: {
										type: "integer",
										label: "Left Margin",
										ref: "margin.left",
										min: "0",
										defaultValue: "30"
									}
								}
							}
						}
					}
				}
			},
			support: {
				snapshot: true,
				export: true,
				exportData: true
			},
			paint: function ($element, layout) {
				// get points on regression line
				var regressionPoints = this.$scope.generateRegressionPoints();

				// svg width and height
				var width = $element.width() - layout.margin.left - layout.margin.right;
				var height = $element.height() - layout.margin.top - layout.margin.bottom;
				
				d3.select("svg")
					.attr("width", $element.width())
					.attr("height", $element.height());
				d3.select(".plot")
					.attr("transform", "translate(" + layout.margin.left + "," + layout.margin.top + ")");
				
				// scales
				var x = d3.scaleLinear()
					.domain([0, d3.max(layout.qHyperCube.qDataPages[0].qMatrix, function(d) { return d[1].qNum; })])
					.range([0, width]);
				var y = d3.scaleLinear()
					.domain([0, d3.max(layout.qHyperCube.qDataPages[0].qMatrix, function(d) { return d[2].qNum; })])
					.range([height, 0]);

				// x and y axis
				d3.select(".x-axis")
					.attr("transform", "translate(0," + height + ")")
					.call(d3.axisBottom(x).tickSizeOuter(0));
				d3.select(".y-axis")
					.call(d3.axisLeft(y).tickSizeOuter(0));

				/////// DOTS //////
				var dots = d3.select(".plot").selectAll(".dot")
					.data(layout.qHyperCube.qDataPages[0].qMatrix);
				//enter
				dots.enter().append("circle")
					.attr("class", "dot")
					.attr("r", 3)
					.attr("stroke", "#293b47")
					.attr("fill", "#7A99AC")
					.attr("cx", function(d) { return x(d[1].qNum); })
					.attr("cy", function(d) { return y(d[2].qNum); });
				//exit
				dots.exit().remove();
				//update
				dots
					.attr("r", 3)
					.attr("stroke", "#293b47")
					.attr("fill", "#7A99AC")
					.attr("cx", function(d) { return x(d[1].qNum); })
					.attr("cy", function(d) { return y(d[2].qNum); });

				//// REGRESSION LINE ////
				var regressionLine = d3.select(".plot").selectAll(".regression")
					.data([regressionPoints]);
				//enter
				regressionLine.enter().append("path")
					.attr("class", "regression")
					.attr("stroke", "#e4002b")
					.attr("stroke-width", "0.5px")
					.attr("d", d3.line().curve(d3.curveCardinal).x(function(d){ return x(d[0]); }).y(function(d){ return y(d[1]); }));
				//exit
				regressionLine.exit().remove();
				//update
				regressionLine
					.attr("stroke", "#e4002b")
					.attr("d", d3.line().curve(d3.curveCardinal).x(function(d){ return x(d[0]); }).y(function(d){ return y(d[1]); }));

				//// STATS ////
				d3.select(".plot").selectAll(".r-squared")
					.data([this.$scope.regression])
					.attr("x", width)
					.attr("y", height - 2)
					.text("R-Squared: " + this.$scope.regression.r2)
				.enter().append("text")
					.attr("class", "r-squared")
					.attr("text-anchor", "end")
					.attr("x", width)
					.attr("y", height - 2)
					.text("R-Squared: " + this.$scope.regression.r2);
				d3.select(".plot").selectAll(".equation")
					.data([this.$scope.regression])
					.attr("x", width)
					.attr("y", height - 20)
					.text("Equation: " + this.$scope.regression.string)
				.enter().append("text")
					.attr("class", "equation")
					.attr("text-anchor", "end")
					.attr("x", width)
					.attr("y", height - 20)
					.text("Equation: " + this.$scope.regression.string);

				//needed for export
				return qlik.Promise.resolve();
			},
			controller: ["$scope", "$element", function ( $scope, $element ) {
				//recalculate regression when user changes regression type
				$scope.$watch("layout.regression", function() {
					$scope.regression = regression($scope.layout.regression.type, $scope.layout.qHyperCube.qDataPages[0].qMatrix.map(function(row){return [row[1].qNum,row[2].qNum]}), $scope.layout.regression.order);
				}, true);

				// function to generate 100 points on regression line so it can be plotted
				$scope.generateRegressionPoints = function() {
					var arr = [];
					var data = $scope.layout.qHyperCube.qDataPages[0].qMatrix.map(function(row){return [row[1].qNum,row[2].qNum]});
					var min = data.reduce(function(min, val) { return val[0] < min ? val[0] : min; }, data[0][0]);
					var max = data.reduce(function(max, val) { return val[0] > max ? val[0] : max; }, data[0][0]);
					var extent = max - min;
					for(var i = 0; i < 100; i++) {
						var x = min + (extent/100)*i;
						arr.push($scope.regression.predict(x));
					}
					return arr;
				};
			}]
		};
	});
