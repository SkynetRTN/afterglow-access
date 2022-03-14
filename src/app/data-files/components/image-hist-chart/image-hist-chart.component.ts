import { Component, OnInit, ViewChild, OnChanges, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';

// declare let d3, nv: any;
// import { NvD3Component } from "ng2-nvd3";

import { ImageHist, getBinCenter, calcLevels } from '../../models/image-hist';
import { ThemePicker } from '../../../theme-picker';
import { ThemeStorage, PlotlyTheme } from '../../../theme-picker/theme-storage/theme-storage';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Normalization } from '../../models/normalization';
import { PixelNormalizer } from '../../models/pixel-normalizer';
import { blueColorMap, greenColorMap, redColorMap } from '../../models/color-map';

@Component({
  selector: 'app-image-hist-chart',
  // template:
  //   '<nvd3 id="hist-chart" class="" [options]="chartOptions" [data]="chartData"></nvd3>',
  templateUrl: './image-hist-chart.html',
  styleUrls: ['./image-hist-chart.component.scss'],
})
export class ImageHistChartComponent implements OnInit, OnChanges {
  // @ViewChild(NvD3Component) nvD3: NvD3Component;

  @Input() data: { hist: ImageHist, normalizer: PixelNormalizer }[] = [];
  @Input() showFittedData: boolean = false;
  @Input() width: number = 200;
  @Input() height: number = 200;
  @Input() backgroundLevel: number = 0;
  @Input() peakLevel: number = 0;

  private yMax = 0;
  public logarithmicX: boolean = true;
  public logarithmicY: boolean = true;

  public chartData: Array<any> = [];
  public layout: Partial<any> = {
    width: null,
    height: null,
    title: {
      text: 'Histogram',
      // font: {
      //   family: 'Courier New, monospace',
      //   size: 24
      // },
      // xref: 'paper',
      // x: 0.05,
    },
    xaxis: {
      autorange: true,
      title: {
        text: 'Pixel Value',
        // font: {
        //   family: 'Courier New, monospace',
        //   size: 18,
        //   color: '#7f7f7f'
        // }
      },
    },
    yaxis: {
      autorange: true,
      title: {
        text: 'Pixel Count',
        // font: {
        //   family: 'Courier New, monospace',
        //   size: 18,
        //   color: '#7f7f7f'
        // }
      },
    },
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50,
    },
  };
  public theme: PlotlyTheme;

  public logXButton = {
    name: 'Toggle Log-X',
    click: () => {
      this.logarithmicX = !this.logarithmicX;
      this.updateChart();
      this._changeDetectorRef.detectChanges();
    },
    icon: {
      width: 24,
      height: 24,
      path:
        'M7.77 6.76L6.23 5.48.82 12l5.41 6.52 1.54-1.28L3.42 12l4.35-5.24zM7 13h2v-2H7v2zm10-2h-2v2h2v-2zm-6 2h2v-2h-2v2zm6.77-7.52l-1.54 1.28L20.58 12l-4.35 5.24 1.54 1.28L23.18 12l-5.41-6.52z',
    },
  };

  public logYButton = {
    name: 'Toggle Log-Y',
    click: () => {
      this.logarithmicY = !this.logarithmicY;
      this.updateChart();
      this._changeDetectorRef.detectChanges();
    },
    icon: {
      width: 24,
      height: 24,
      path:
        'M7.77 6.76L6.23 5.48.82 12l5.41 6.52 1.54-1.28L3.42 12l4.35-5.24zM7 13h2v-2H7v2zm10-2h-2v2h2v-2zm-6 2h2v-2h-2v2zm6.77-7.52l-1.54 1.28L20.58 12l-4.35 5.24 1.54 1.28L23.18 12l-5.41-6.52z',
      transform: 'rotate(90 12 12)',
    },
  };

  // https://github.com/plotly/plotly.js/blob/master/src/components/modebar/buttons.js

  public config: Partial<any> = {
    scrollZoom: true,
    displaylogo: false,
    modeBarButtons: [
      [this.logXButton, this.logYButton],
      ['toImage', 'zoomIn2d', 'zoomOut2d', 'autoScale2d'],
    ],
  };

  constructor(private themeStorage: ThemeStorage, private _changeDetectorRef: ChangeDetectorRef) {
    this.theme = themeStorage.getCurrentColorTheme().plotlyTheme;
    themeStorage.onThemeUpdate.subscribe(() => {
      this.theme = themeStorage.getCurrentColorTheme().plotlyTheme;
      this._changeDetectorRef.detectChanges();
    });
  }

  ngOnInit() {
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
    let markerColors = {}
    markerColors[redColorMap.name] = '#dc3912'
    markerColors[greenColorMap.name] = '#109618'
    markerColors[blueColorMap.name] = '#3366cc'

    this.chartData = [];
    this.data.forEach(({ hist, normalizer }) => {
      if (!hist || !normalizer || !hist.loaded || !hist.data) return;

      let scale = this.showFittedData ? normalizer.channelScale : 1;
      let offset = this.showFittedData ? normalizer.channelOffset : 0;

      let x = [];
      let y = [];
      for (let i = 0; i < hist.data.length; i++) {
        if (hist.data[i] <= 1 || (this.logarithmicX && getBinCenter(hist, i) <= 0)) continue;
        x.push(getBinCenter(hist, i) * scale + offset);
        y.push(hist.data[i]);
        if (this.yMax < hist.data[i]) this.yMax = hist.data[i];
      }

      let d = {
        x: x,
        y: y,
        // fill: "tozeroy",
        type: 'scatter',
        marker: {}
        // mode: "none"
      }


      let markerColor = markerColors[normalizer.colorMapName];
      if (markerColor) {
        d.marker = {
          color: markerColor,
          line: {
            color: markerColor
          }
        }
      }

      this.chartData.push(d);

    })

    if (this.layout.width != this.width) this.layout.width = this.width;
    if (this.layout.height != this.height) this.layout.height = this.height;

    // let levels = calcLevels(hist, this.backgroundPercentile, this.peakPercentile);
    let levels = { backgroundLevel: this.backgroundLevel, peakLevel: this.peakLevel }

    let shapes: any[] = [];
    if (levels.backgroundLevel) {
      shapes.push(
        {
          type: 'line',
          x0: !this.logarithmicX ? levels.backgroundLevel : Math.max(levels.backgroundLevel, 0.1),
          y0: 1,
          x1: !this.logarithmicX ? levels.backgroundLevel : Math.max(levels.backgroundLevel, 0.1),
          y1: this.yMax,
          line: {
            color: 'red',
            width: 2,
            dash: 'dot',
          },
        },
      )
    }
    if (levels.peakLevel) {
      shapes.push(
        {
          type: 'line',
          x0: !this.logarithmicX ? levels.peakLevel : Math.max(levels.peakLevel, 0.1),
          y0: 1,
          x1: !this.logarithmicX ? levels.peakLevel : Math.max(levels.peakLevel, 0.1),
          y1: this.yMax,
          line: {
            color: 'red',
            width: 2,
            dash: 'dot',
          },
        }
      )
    }

    this.layout = {
      ...this.layout,
      showlegend: false,
      xaxis: {
        ...this.layout.xaxis,
        type: this.logarithmicX ? 'log' : 'linear',

      },
      yaxis: {
        ...this.layout.yaxis,
        type: this.logarithmicY ? 'log' : 'linear',
      },
      shapes: shapes,
    };

  }

  ngOnChanges() {
    this.updateChart();
  }
}
