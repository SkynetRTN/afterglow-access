import {
  Component,
  OnInit,
  ViewChild,
  OnChanges,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef
} from "@angular/core";

// declare let d3, nv: any;
// import { NvD3Component } from "ng2-nvd3";

import { ImageHist, getBinCenter } from "../../models/image-hist";
import { ThemePicker } from '../../../theme-picker';
import { ThemeStorage, PlotlyTheme } from '../../../theme-picker/theme-storage/theme-storage';
import { Plotly } from 'angular-plotly.js/src/app/shared/plotly.interface';

@Component({
  selector: "app-image-hist-chart",
  // template:
  //   '<nvd3 id="hist-chart" class="" [options]="chartOptions" [data]="chartData"></nvd3>',
  templateUrl: "./image-hist-chart.html",
  styleUrls: ["./image-hist-chart.component.scss"]
})
export class ImageHistChartComponent implements OnInit, OnChanges {
  // @ViewChild(NvD3Component) nvD3: NvD3Component;

  @Input() hist: ImageHist;
  @Input() width: number = 200;
  @Input() height: number = 200;
  @Input() backgroundLevel: number;
  @Input() peakLevel: number;

  @Output() onBackgroundLevelChange = new EventEmitter<number>();
  @Output() onPeakLevelChange = new EventEmitter<number>();

  math = Math;
  private lastHistData;


  public data : Array<Plotly.Data> = [];
  public layout: Partial<Plotly.Layout> = {
    width: null,
    height: null,
    xaxis: {
      type: 'linear',
      autorange: true,

    },
    yaxis: {
      type: 'log',
      autorange: true,
    },
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50
    },
    
  };
  public theme: PlotlyTheme;

  public config: Partial<Plotly.Config> = {
    scrollZoom: true
  };
  
  // private backgroundLineData = {
  //   isBackground: true,
  //   x1: 0,
  //   y1: 0,
  //   x2: 0,
  //   y2: 0
  // };

  // private peakLineData = {
  //   isBackground: false,
  //   x1: 0,
  //   y1: 0,
  //   x2: 0,
  //   y2: 0
  // };


  constructor(private themeStorage: ThemeStorage, private _changeDetectorRef: ChangeDetectorRef) {
    this.theme = themeStorage.getCurrentColorTheme().plotlyTheme;
    themeStorage.onThemeUpdate.subscribe(theme => {
      this.theme = themeStorage.getCurrentColorTheme().plotlyTheme;
      this._changeDetectorRef.detectChanges();
    })
  }


  select($event) {}

  activate($event) {}

  deactivate($event) {}

  // updateChartOptions() {
  //   this.chartOptions = {
  //     chart: {
  //       type: "stackedAreaChart",
  //       focusEnable: false,
  //       height: this.height,
  //       width: this.width,
  //       showLegend: false,
  //       x: function(d) {
  //         return d.x;
  //       },
  //       y: function(d) {
  //         return d.y;
  //       },
  //       useInteractiveGuideline: true,
  //       isArea: true,
  //       // yAxis: {
  //       //   tickValues: [10, 100, 1000, 10000, 100000],
  //       //   showMaxMin: false
  //       //   // tickFormat: function(d) {
  //       //   //   return d3.format('e')(d);
  //       //   // }
  //       // },
  //       xAxis: {
  //         showMaxMin: false
  //       },
  //       // xScale: d3.scale.log(),
  //       yScale: d3.scale.log(),
  //       focusShowAxisX: false,
  //       noData: "Histogram not available",
  //       // lines: {
  //       //   dispatch: {
  //       //     elementClick: function(e) {
  //       //       // console.log(this.backgroundLevelFocused);
  //       //       // console.log(this.peakLevelFocused);
  //       //       console.log(e[0].point.x, e[0].point.y);
  //       //     }.bind(this),
  //       //     elementDblClick: function(e) {console.log("! lines element Double Click !", e)},
  //       //     elementMouseout: function(e) {console.log("! lines element Mouseout !", e)},
  //       //     elementMouseover: function(e) {console.log("! lines element Mouseover !", e)}
  //       //   }
  //       // },
  //       callback: this.onChartCreation.bind(this),
  //       zoom: {
  //         enabled: true,
  //         scaleExtent: [1, 10],
  //         useFixedDomain: false,
  //         useNiceScale: false,
  //         horizontalOff: false,
  //         verticalOff: true,
  //         unzoomEventType: "dblclick.zoom"
  //       }
  //       // interactiveLayer: {
  //       //   dispatch: {
  //       //     elementDblclick: function(e){console.log("! interative element Double Click !", e)},
  //       //     elementMousemove: function(e){console.log("! interative element Mouseover !", e)},
  //       //     elementMouseout: function(e){console.log("! interative element Mouseout !", e)}
  //       //   }
  //       // }
  //     }
  //   };
  // }

  ngOnInit() {
    // this.updateChartOptions();
  }

  onChartCreation() {
    // x values of vertical lines
    // add vertical lines
    // this.updateBackgroundPeakLines();
  }

  updateBackgroundPeakLines() {
    // let self = this;
    // if (
    //   this.nvD3.svg &&
    //   this.hist &&
    //   this.backgroundLevel != undefined &&
    //   this.peakLevel != undefined
    // ) {
    //   let lineGroup = this.nvD3.svg
    //     .select(".nv-linesWrap")
    //     .selectAll("g.levels");
    //   if (lineGroup.empty()) {
    //     lineGroup = this.nvD3.svg
    //       .select(".nv-linesWrap")
    //       .append("g")
    //       .classed("levels", true);
    //   }
    //   this.backgroundLineData.x1 = this.backgroundLineData.x2 = this.backgroundLevel;
    //   this.peakLineData.x1 = this.peakLineData.x2 = this.peakLevel;
    //   this.backgroundLineData.y1 = this.peakLineData.y1 = 0;
    //   this.backgroundLineData.y2 = this.peakLineData.y2 = d3.max(
    //     this.hist.data
    //   );
    //   let data = [this.backgroundLineData, this.peakLineData];
    //   let lines = lineGroup.selectAll("line").data(data);
    //   lines.transition().attr({
    //     x1: function(d) {
    //       return self.nvD3.chart.xAxis.scale()(d.x1);
    //     },
    //     y1: function(d) {
    //       return self.nvD3.chart.yAxis.scale()(d.y1);
    //     },
    //     x2: function(d) {
    //       return self.nvD3.chart.xAxis.scale()(d.x2);
    //     },
    //     y2: function(d) {
    //       return self.nvD3.chart.yAxis.scale()(d.y2);
    //     }
    //   });
    //   lines
    //     .enter()
    //     .append("line")
    //     .attr({
    //       x1: function(d) {
    //         return self.nvD3.chart.xAxis.scale()(d.x1);
    //       },
    //       y1: function(d) {
    //         return self.nvD3.chart.yAxis.scale()(d.y1);
    //       },
    //       x2: function(d) {
    //         return self.nvD3.chart.xAxis.scale()(d.x2);
    //       },
    //       y2: function(d) {
    //         return self.nvD3.chart.yAxis.scale()(d.y2);
    //       }
    //     })
    //     .style("stroke", function(d) {
    //       return d.isBackground ? "rgb(0, 0, 255)" : "rgb(255, 0, 0)";
    //     })
    //     .style("stroke-width", 4)
    //     .style("stroke-opacity", 0.5)
    //     .style("stroke-linecap", "round")
    //     .style("cursor", "pointer")
    //     .call(
    //       d3.behavior.drag().on("drag", function(d, i) {
    //         if (d3.event.dx == 0) return;
    //         let value = self.nvD3.chart.xAxis.scale().invert(d3.event.x);
    //         let levels;
    //         if (d.isBackground) {
    //           self.onBackgroundLevelChange.emit(value);
    //           //levels = {background: value, peak: self.normalizer.peakLevel};
    //         } else {
    //           self.onPeakLevelChange.emit(value);
    //           //console.log('next peak:', value);
    //           //levels = {background: self.normalizer.backgroundLevel, peak: value};
    //         }
    //         //console.log(levels);
    //         //self.levels$.next(levels$);
    //         d.x1 = value;
    //         d.x2 = value;
    //         d3.select(this).attr({
    //           x1: function(d) {
    //             return self.nvD3.chart.xAxis.scale()(d.x1);
    //           },
    //           y1: function(d) {
    //             return self.nvD3.chart.yAxis.scale()(d.y1);
    //           },
    //           x2: function(d) {
    //             return self.nvD3.chart.xAxis.scale()(d.x2);
    //           },
    //           y2: function(d) {
    //             return self.nvD3.chart.yAxis.scale()(d.y2);
    //           }
    //         });
    //       })
    //     );
    //   lines.exit().remove();
    //   // self.nvD3.chart.focus.dispatch.on("onBrush.levels$", function(extent) {
    //   //   self.updateBackgroundPeakLines();
    //   // });
    //   // // resize the chart with vertical lines
    //   // // but only the third line will be scaled properly...
    //   // nv.utils.windowResize(function() {
    //   // 	this.nvD3.chart.update();
    //   //   lineGroup.selectAll('line')
    //   //   .transition()
    //   //   .attr({
    //   //       x1: function(d){ return self.nvD3.chart.xAxis.scale()(d.x1) },
    //   //       y1: function(d){ return self.nvD3.chart.yAxis.scale()(d.y1) },
    //   //       x2: function(d){ return self.nvD3.chart.xAxis.scale()(d.x2) },
    //   //       y2: function(d){ return self.nvD3.chart.yAxis.scale()(d.y2) }
    //   //     });
    //   // }.bind(this));
    // }
  }

  ngOnChanges() {
    let x = [];
    let y = [];
    if (this.hist && this.hist.data != this.lastHistData) {
      x = Array(this.hist.data.filter(d => d > 1).length);
      let j = 0;
      for (let i = 0; i < this.hist.data.length; i++) {
        if (this.hist.data[i] <= 1) continue;
        x[j] = getBinCenter(this.hist, i);
        y[j] = this.hist.data[i];
        j++;
      }
     
      this.data = [
        {
          x: x,
          y: y,
          fill: "tozeroy",
          type: "scatter",
          mode: "none"
        }
      ];
      
      this.lastHistData = this.hist.data;
      //this.chartOptions.chart.xAxis.tickValues=[result[0].x, result[result.length-1].x];
      //console.log(this.chartOptions);
    }
    setTimeout(() => {
      this.updateBackgroundPeakLines();
    });

    if(this.layout.width != this.width) this.layout.width = this.width;
    if(this.layout.height != this.height) this.layout.height = this.height;

    //this.updateChartOptions();
  }
}
