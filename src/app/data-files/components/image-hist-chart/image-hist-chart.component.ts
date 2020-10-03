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
import { MatCheckboxChange } from '@angular/material/checkbox';

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
  public logarithmicX: boolean = true;
  public logarithmicY: boolean = true;

  public data: Array<any> = [];
  public layout: Partial<any> = {
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

  

  public logXButton = {
    name: 'Toggle Log-X',
    click: (gd) => {
      this.logarithmicX = !this.logarithmicX;
      this.updateChart();
      this._changeDetectorRef.detectChanges();
    },
    icon: {
      width: 24,
      height: 24,
      path: 'M7.77 6.76L6.23 5.48.82 12l5.41 6.52 1.54-1.28L3.42 12l4.35-5.24zM7 13h2v-2H7v2zm10-2h-2v2h2v-2zm-6 2h2v-2h-2v2zm6.77-7.52l-1.54 1.28L20.58 12l-4.35 5.24 1.54 1.28L23.18 12l-5.41-6.52z',
    }
  }

  public logYButton = {
    name: 'Toggle Log-Y',
    click: (gd) => {
      this.logarithmicY = !this.logarithmicY;
      this.updateChart();
      this._changeDetectorRef.detectChanges();
      
    },
    icon: {
      width: 24,
      height: 24,
      path: 'M7.77 6.76L6.23 5.48.82 12l5.41 6.52 1.54-1.28L3.42 12l4.35-5.24zM7 13h2v-2H7v2zm10-2h-2v2h2v-2zm-6 2h2v-2h-2v2zm6.77-7.52l-1.54 1.28L20.58 12l-4.35 5.24 1.54 1.28L23.18 12l-5.41-6.52z',
      transform: 'rotate(90 12 12)'
    }
  }

  // https://github.com/plotly/plotly.js/blob/master/src/components/modebar/buttons.js

  public config: Partial<any> = {
    scrollZoom: true,
    displaylogo: false,
    modeBarButtons: [
      [this.logXButton, this.logYButton],
      ['toImage', 'zoomIn2d', 'zoomOut2d', 'autoScale2d',]
    ]
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
        for (let i = 0; i < this.hist.data.length; i++) {
          if (this.hist.data[i] <= 1 || (this.logarithmicX && getBinCenter(this.hist, i) <= 0)) continue;
          x.push(getBinCenter(this.hist, i));
          y.push(this.hist.data[i]);
          if (this.yMax < this.hist.data[i]) this.yMax = this.hist.data[i];
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
            x0: !this.logarithmicX ? levels.backgroundLevel : Math.max(levels.backgroundLevel, 0.1),
            y0: 1,
            x1: !this.logarithmicX ? levels.backgroundLevel : Math.max(levels.backgroundLevel, 0.1),
            y1: this.yMax,
            line: {
              color: "red",
              width: 2,
              dash: "dot"
            }
          },
          {
            type: "line",
            x0: !this.logarithmicX ? levels.peakLevel : Math.max(levels.peakLevel, 0.1),
            y0: 1,
            x1: !this.logarithmicX ? levels.peakLevel : Math.max(levels.peakLevel, 0.1),
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
