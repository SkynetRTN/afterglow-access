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

import { ImageHist, getBinCenter, calcLevels } from "../../models/image-hist";
import { ThemePicker } from '../../../theme-picker';
import { ThemeStorage, PlotlyTheme } from '../../../theme-picker/theme-storage/theme-storage';
import { Plotly } from 'angular-plotly.js/src/app/shared/plotly.interface';
import { MatCheckboxChange } from '@angular/material';

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
  @Input() backgroundPercentile: number;
  @Input() peakPercentile: number;

  math = Math;
  private lastHistData;
  private yMax = 0;
  public logarithmicX: boolean = false;
  public logarithmicY: boolean = true;

  public data: Array<Plotly.Data> = [];
  public layout: Partial<Plotly.Layout> = {
    width: null,
    height: null,
    xaxis: {
      autorange: true,

    },
    yaxis: {
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


  select($event) { }

  activate($event) { }

  deactivate($event) { }

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

  onXAxisTypeChange($event: MatCheckboxChange) {
    this.logarithmicX = $event.checked;
    this.updateChart();
  }

  onYAxisTypeChange($event: MatCheckboxChange) {
    this.logarithmicY = $event.checked;
    this.updateChart();
  }

  updateChart() {
    let x = [];
    let y = [];
    if (this.hist) {
      if (this.hist.data != this.lastHistData) {
        x = Array(this.hist.data.filter(d => d > 1).length);
        let j = 0;
        for (let i = 0; i < this.hist.data.length; i++) {
          if (this.hist.data[i] <= 1) continue;
          x[j] = getBinCenter(this.hist, i);
          y[j] = this.hist.data[i];
          if (this.yMax < y[j]) this.yMax = y[j];

          j++;

        }

        this.data = [
          {
            x: x,
            y: y,
            // fill: "tozeroy",
            type: "scatter",
            // mode: "none"
          }
        ];

        this.lastHistData = this.hist.data;
        //this.chartOptions.chart.xAxis.tickValues=[result[0].x, result[result.length-1].x];
        //console.log(this.chartOptions);
      }

      if (this.layout.width != this.width) this.layout.width = this.width;
      if (this.layout.height != this.height) this.layout.height = this.height;

      let levels = calcLevels(this.hist, this.backgroundPercentile, this.peakPercentile);
      this.layout = {
        ...this.layout,
        xaxis: {
          ...this.layout.xaxis,
          type: this.logarithmicX ? 'log' : 'linear',
        },
        yaxis: {
          ...this.layout.yaxis,
          type: this.logarithmicY ? 'log' : 'linear',
        },
        shapes: [
          // Line Vertical
          {
            type: "line",
            x0: levels.backgroundLevel,
            y0: 1,
            x1: levels.backgroundLevel,
            y1: this.yMax,
            line: {
              color: "red",
              width: 2,
              dash: "dot"
            }
          },
          {
            type: "line",
            x0: levels.peakLevel,
            y0: 1,
            x1: levels.peakLevel,
            y1: this.yMax,
            line: {
              color: "red",
              width: 2,
              dash: "dot"
            }
          },
        ]
      }

    }



  }

  ngOnChanges() {
    this.updateChart();
  }
}
