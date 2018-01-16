import { Component, OnInit, ViewChild,
  OnChanges, Input, Output, EventEmitter } from '@angular/core';

declare let d3, nv: any;
import { NvD3Component } from 'ng2-nvd3';

import { ImageHist, getBinCenter } from '../../models/image-hist';

@Component({
  selector: 'app-image-hist-chart',
  template: '<nvd3 id="hist-chart" class="" [options]="chartOptions" [data]="chartData"></nvd3>',
  styleUrls: ['./image-hist-chart.component.scss']
})
export class ImageHistChartComponent implements OnInit, OnChanges {
  @ViewChild(NvD3Component) nvD3: NvD3Component;
  
  @Input() hist: ImageHist;
  @Input() backgroundLevel: number;
  @Input() peakLevel: number;

  @Output() onBackgroundLevelChange = new EventEmitter<number>();
  @Output() onPeakLevelChange = new EventEmitter<number>();

  private lastHistData;
  private chartOptions;
  private chartData;
 
  private backgroundLineData = {
    isBackground: true,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
  };

  private peakLineData = {
    isBackground: false,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
  };


  constructor() { }

  ngOnInit() {
    this.chartOptions = {
      chart: {
        type: 'lineChart',
        focusEnable: false,
        height: 250,
        showLegend: false,
        x: function(d){ return d.x; },
        y: function(d){ return d.y; },
        useInteractiveGuideline: true,
        isArea: true,
        yAxis: {
          tickValues: [10, 100, 1000, 10000, 100000],
          showMaxMin: false,
          // tickFormat: function(d) {
          //   return d3.format('e')(d);
          // }
        },
        xAxis: {
          showMaxMin: false
        },
        // xScale: d3.scale.log(),
        yScale: d3.scale.log(),
        focusShowAxisX: false,
        noData: 'Histogram not available',
        // lines: {
        //   dispatch: {
        //     elementClick: function(e) {
        //       // console.log(this.backgroundLevelFocused);
        //       // console.log(this.peakLevelFocused);
        //       console.log(e[0].point.x, e[0].point.y);
        //     }.bind(this),
        //     elementDblClick: function(e) {console.log("! lines element Double Click !", e)},
        //     elementMouseout: function(e) {console.log("! lines element Mouseout !", e)},
        //     elementMouseover: function(e) {console.log("! lines element Mouseover !", e)}
        //   }
        // },
        callback: this.onChartCreation.bind(this)
        // interactiveLayer: {
        //   dispatch: {
        //     elementDblclick: function(e){console.log("! interative element Double Click !", e)},
        //     elementMousemove: function(e){console.log("! interative element Mouseover !", e)},
        //     elementMouseout: function(e){console.log("! interative element Mouseout !", e)}
        //   }
        // }
      }
    };
  }

  onChartCreation() {
    // x values of vertical lines
    // add vertical lines
    this.updateBackgroundPeakLines();
  }

  updateBackgroundPeakLines() {
    let self = this;


    if(this.nvD3.svg && this.hist && this.backgroundLevel != undefined && this.peakLevel != undefined) {
      let lineGroup = this.nvD3.svg.select('.nv-linesWrap').selectAll('g.levels');
      if(lineGroup.empty()) {
        lineGroup = this.nvD3.svg.select('.nv-linesWrap').append('g').classed('levels', true);
      }
      this.backgroundLineData.x1 = this.backgroundLineData.x2 = this.backgroundLevel;
      this.peakLineData.x1 = this.peakLineData.x2 = this.peakLevel;
      this.backgroundLineData.y1 = this.peakLineData.y1 = 0;
      this.backgroundLineData.y2 = this.peakLineData.y2 = d3.max(this.hist.data);
      let data = [this.backgroundLineData, this.peakLineData];

      let lines = lineGroup.selectAll('line')
        .data(data);

      lines.transition()
      .attr({
            x1: function(d){ return self.nvD3.chart.xAxis.scale()(d.x1) },
            y1: function(d){ return self.nvD3.chart.yAxis.scale()(d.y1) },
            x2: function(d){ return self.nvD3.chart.xAxis.scale()(d.x2) },
            y2: function(d){ return self.nvD3.chart.yAxis.scale()(d.y2) }
        });

      lines.enter()
        .append('line')
        .attr({
          x1: function(d){ return self.nvD3.chart.xAxis.scale()(d.x1) },
          y1: function(d){ return self.nvD3.chart.yAxis.scale()(d.y1) },
          x2: function(d){ return self.nvD3.chart.xAxis.scale()(d.x2) },
          y2: function(d){ return self.nvD3.chart.yAxis.scale()(d.y2) }
        })
        .style('stroke', function(d){ return d.isBackground ? 'rgb(0, 0, 255)' : 'rgb(255, 0, 0)';})
        .style('stroke-width', 4)
        .style('stroke-opacity', 0.5)
        .style('stroke-linecap', 'round')
        .style('cursor', 'pointer')
        .call(d3.behavior.drag()
          .on("drag", function(d,i) {
            if(d3.event.dx == 0) return;

            let value = self.nvD3.chart.xAxis.scale().invert(d3.event.x);
            let levels;
            if(d.isBackground) {
              self.onBackgroundLevelChange.emit(value);
              //levels = {background: value, peak: self.normalizer.peakLevel};
            }
            else {
              self.onPeakLevelChange.emit(value);
              //console.log('next peak:', value);
              //levels = {background: self.normalizer.backgroundLevel, peak: value};
            }
            //console.log(levels);
            //self.levels$.next(levels$);

            d.x1 = value;
            d.x2 = value;
            d3.select(this)
              .attr({
                x1: function(d){ return self.nvD3.chart.xAxis.scale()(d.x1) },
                y1: function(d){ return self.nvD3.chart.yAxis.scale()(d.y1) },
                x2: function(d){ return self.nvD3.chart.xAxis.scale()(d.x2) },
                y2: function(d){ return self.nvD3.chart.yAxis.scale()(d.y2) }
            });
          }));

        lines.exit().remove();

        // self.nvD3.chart.focus.dispatch.on("onBrush.levels$", function(extent) {
        //   self.updateBackgroundPeakLines();
        // });



        // // resize the chart with vertical lines
        // // but only the third line will be scaled properly...
        // nv.utils.windowResize(function() {
        // 	this.nvD3.chart.update();
        //   lineGroup.selectAll('line')
        //   .transition()
        //   .attr({
        //       x1: function(d){ return self.nvD3.chart.xAxis.scale()(d.x1) },
        //       y1: function(d){ return self.nvD3.chart.yAxis.scale()(d.y1) },
        //       x2: function(d){ return self.nvD3.chart.xAxis.scale()(d.x2) },
        //       y2: function(d){ return self.nvD3.chart.yAxis.scale()(d.y2) }
        //     });
        // }.bind(this));


    }
  }



  ngOnChanges() {
    let result = [];
    if(this.hist && this.hist.data != this.lastHistData) {
      result = Array(this.hist.data.length);
      for(let i=0; i<result.length; i++)  {
        result[i] = {x: getBinCenter(this.hist, i), y: this.hist.data[i]}
      }
      this.chartData = [
        {
          values: result,
          key: 'histogram',
          color: '#2ca02c'
        }
      ];
      this.lastHistData = this.hist.data;
      //this.chartOptions.chart.xAxis.tickValues=[result[0].x, result[result.length-1].x];
      //console.log(this.chartOptions);
    }
    this.updateBackgroundPeakLines();
  }

}
