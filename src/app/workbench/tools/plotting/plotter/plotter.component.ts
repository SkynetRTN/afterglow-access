import { Component, OnInit, OnChanges, ViewChild, AfterViewInit, Input, ChangeDetectorRef, ElementRef } from '@angular/core';

import { Subject } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

import { DataFile, ImageLayer, PixelType } from '../../../../data-files/models/data-file';
import { PlotlyTheme, ThemeStorage } from '../../../../theme-picker/theme-storage/theme-storage';
import { getPixel, getPixels, IImageData } from '../../../../data-files/models/image-data';
import { Wcs } from '../../../../image-tools/wcs';
// import { NvD3Component } from "ng2-nvd3";

@Component({
  selector: 'app-plotter',
  templateUrl: './plotter.component.html',
  styleUrls: ['./plotter.component.scss'],
})
export class PlotterComponent implements OnInit, OnChanges {
  @Input()
  wcs: Wcs;
  @Input()
  imageData: IImageData<PixelType>;
  @Input()
  plotMode: '1D' | '2D' | '3D';
  @Input()
  colorMode: 'grayscale' | 'rgba';
  @Input()
  width: number;
  @Input()
  height: number;
  @Input()
  lineMeasureStart: { x: number; y: number };
  @Input()
  lineMeasureEnd: { x: number; y: number };
  @Input()
  interpolatePixels: boolean;

  // @ViewChild(NvD3Component)
  // nvD3: NvD3Component;

  private currentSeparation = null;
  private currentSeparationScaled = null;
  private currentSeparationScaledUnits = null;
  private crosshairX: number = null;
  private crosshairY: number = null;

  private observer: ResizeObserver;

  public data: Array<any> = [];
  public layout: Partial<any> = {
    width: null,
    height: null,
    xaxis: {
      type: 'linear',
      autorange: true,
    },
    yaxis: {
      type: 'linear',
      autorange: true,
    },
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50,
    },
    showlegend: false,
  };
  public baseTheme: PlotlyTheme;
  public theme: PlotlyTheme;

  // public customButton = {
  //   name: 'click me',
  //   click: function (gd) {
  //   },
  //   newplotlylogo: {
  //     name: 'newplotlylogo',
  //     svg: '<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 132 132\'><defs><style>.cls-1 {fill: #119dff;} .cls-2 {fill: #25fefd;} .cls-3 {fill: #fff;}</style></defs><title>plotly-logomark</title><g id=\'symbol\'><rect class=\'cls-1\' width=\'132\' height=\'132\' rx=\'6\' ry=\'6\'/><circle class=\'cls-2\' cx=\'78\' cy=\'54\' r=\'6\'/><circle class=\'cls-2\' cx=\'102\' cy=\'30\' r=\'6\'/><circle class=\'cls-2\' cx=\'78\' cy=\'30\' r=\'6\'/><circle class=\'cls-2\' cx=\'54\' cy=\'30\' r=\'6\'/><circle class=\'cls-2\' cx=\'30\' cy=\'30\' r=\'6\'/><circle class=\'cls-2\' cx=\'30\' cy=\'54\' r=\'6\'/><path class=\'cls-3\' d=\'M30,72a6,6,0,0,0-6,6v24a6,6,0,0,0,12,0V78A6,6,0,0,0,30,72Z\'/><path class=\'cls-3\' d=\'M78,72a6,6,0,0,0-6,6v24a6,6,0,0,0,12,0V78A6,6,0,0,0,78,72Z\'/><path class=\'cls-3\' d=\'M54,48a6,6,0,0,0-6,6v48a6,6,0,0,0,12,0V54A6,6,0,0,0,54,48Z\'/><path class=\'cls-3\' d=\'M102,48a6,6,0,0,0-6,6v48a6,6,0,0,0,12,0V54A6,6,0,0,0,102,48Z\'/></g></svg>'
  //   }
  // }

  //https://github.com/plotly/plotly.js/blob/master/src/components/modebar/buttons.js

  public config: Partial<any> = {
    scrollZoom: true,
    displaylogo: false,
    modeBarButtons: [
      //[this.customButton],
      ['toImage', 'zoomIn2d', 'zoomOut2d', 'autoScale2d'],
    ],
  };

  private chartDebouncer$: Subject<null> = new Subject();

  constructor(private themeStorage: ThemeStorage, private cd: ChangeDetectorRef, private element: ElementRef<HTMLElement>) {
    this.baseTheme = themeStorage.getCurrentColorTheme().plotlyTheme;
    this.updateTheme();
    themeStorage.onThemeUpdate.subscribe((theme) => {
      this.baseTheme = themeStorage.getCurrentColorTheme().plotlyTheme;
      this.updateTheme();
      this.cd.detectChanges();
    });
  }

  ngOnInit() {
    let self = this;

    this.observer = new ResizeObserver(() => {
      this.updateChart()
    });
    this.observer.observe(this.element.nativeElement);

    this.chartDebouncer$.pipe(throttleTime(50)).subscribe((value) => {
      this.updateChart();
    });

    // this.updateChartOptions();

    this.chartDebouncer$.next();
  }

  ngOnChanges() {
    this.updateLineView();
    this.chartDebouncer$.next();


    // this.updateChartOptions();
  }

  public getData() {
    return this.data.length == 0 ? null : this.data[0];
  }

  private onChartCreation() {
    // let self = this;
    // let onChartMouseMove = xy => {
    //   if (this.lineMeasureStart && this.lineMeasureEnd) {
    //     let xScale = self.nvD3.chart.xAxis.scale();
    //     let yScale = self.nvD3.chart.yAxis.scale();
    //     let t = xScale.invert(xy[0]);
    //     //let y = yScale.invert(xy[1]);
    //     let start = self.lineMeasureStart;
    //     let end = self.lineMeasureEnd;
    //     let v = { x: end.x - start.x, y: end.y - start.y };
    //     let vLength = Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));
    //     let vUnit = { x: v.x / vLength, y: v.y / vLength };
    //     //console.log(vUnit.x*t + start.x, vUnit.y*t + start.y);
    //     self.crosshairX = vUnit.x * t + start.x;
    //     self.crosshairY = vUnit.y * t + start.y;
    //     self.updateLineView();
    //     //self.nvD3.chart.xAxis.scale().invert(d3.event.offsetX), self.nvD3.chart.yAxis.scale().invert(d3.event.offsetY)
    //     //console.log('mouse over', e.mouseX, self.nvD3.chart.xAxis.scale().invert(e.mouseX));
    //   }
    // };
    // let onChartMouseOut = () => {
    //   self.crosshairX = null;
    //   self.crosshairY = null;
    //   self.updateLineView();
    // };
    // if (this.nvD3.svg) {
    //   this.nvD3.svg.select(".nv-linesWrap").on("mousemove.lines", function(e) {
    //     onChartMouseMove(d3.mouse(this));
    //   });
    //   this.nvD3.svg
    //     .select(".nv-background")
    //     .on("mousemove.background", function(e) {
    //       onChartMouseMove(d3.mouse(this));
    //     });
    //   this.nvD3.svg
    //     .select(".nv-lineChart")
    //     .on("mouseout.linechart", function(e) {
    //       onChartMouseOut();
    //     });
    // }
  }

  updateTheme() {
    this.theme = {
      ...this.baseTheme,
      colorWay: this.colorMode == 'rgba' ? ['#DB4437', '#0F9D58', '#4285F4'] : this.baseTheme.colorWay,
    };
  }

  private updateChart() {

    let width = this.width || this.element?.nativeElement?.getBoundingClientRect().width
    let height = this.height || this.element?.nativeElement?.getBoundingClientRect().height

    if (this.layout.width != width) this.layout.width = width;
    if (this.layout.height != height) this.layout.height = height;




    if (!this.imageData || !this.lineMeasureStart || !this.lineMeasureEnd) {
      this.data = [];
      return;
    }

    let start = this.lineMeasureStart;
    let end = this.lineMeasureEnd;

    if (this.plotMode == '1D') {
      let v = { x: end.x - start.x, y: end.y - start.y };
      let vLength = Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));

      if (vLength == 0) {
        this.data = [];
        return;
      }

      let vUnit = { x: v.x / vLength, y: v.y / vLength };

      let numPoints = 256;
      let spacing = vLength / numPoints;
      let result = new Array(numPoints);
      let xs = new Array(numPoints);
      let ys = new Array(numPoints);
      let ts = new Array(numPoints);
      let vs = new Array(numPoints);

      for (let i = 0; i < numPoints; i++) {
        let t = i * spacing;
        let x = start.x + vUnit.x * t;
        let y = start.y + vUnit.y * t;

        xs[i] = x;
        ys[i] = y;
        ts[i] = t;
        vs[i] = getPixel(this.imageData, x, y, this.interpolatePixels);

        // result[i] = {
        //   x: x,
        //   y: y,
        //   t: t,
        //   v: getPixel(this.imageFile, x, y, this.interpolatePixels),
        //   x0: x,
        //   y0: y
        // };
      }

      if (this.colorMode == 'rgba') {
        let ry = vs.map((v) => v & 0xff);
        let gy = vs.map((v) => (v >> 8) & 0xff);
        let by = vs.map((v) => (v >> 16) & 0xff);
        this.data = [
          {
            x: ts,
            y: ry,
            // fill: "tozeroy",
            type: 'scatter',
            // mode: "none",
            name: 'red',
          },
          {
            x: ts,
            y: gy,
            // fill: "tozeroy",
            type: 'scatter',
            // mode: "none",
            name: 'green',
          },
          {
            x: ts,
            y: by,
            // fill: "tozeroy",
            type: 'scatter',
            // mode: "none",
            name: 'blue',
          },
        ];
      } else {
        this.data = [
          {
            x: ts,
            y: vs,
            // fill: "tozeroy",
            type: 'scatter',
            // mode: "none",
          },
        ];
        if ('colorWay' in this.layout) {
          delete this.layout['colorWay'];
        }
      }
      this.updateTheme();
    } else if (this.plotMode == '3D' || this.plotMode == '2D') {
      let x = Math.floor(Math.min(start.x, end.x));
      let y = Math.floor(Math.min(start.y, end.y));
      let width = Math.floor(Math.abs(start.x - end.x));
      let height = Math.floor(Math.abs(start.y - end.y));

      if (width != 0 && height != 0) {
        this.data = [
          {
            z: getPixels(this.imageData, x, y, width, height),
            type: this.plotMode == '3D' ? 'surface' : 'heatmap',
          },
        ];
      }
    }

    this.layout = {
      ...this.layout,
    }

    // this.data = [
    //   {
    //     values: result,
    //     key: "cross-section",
    //     color: "rgb(44, 44, 160)"
    //   }
    // ];
    this.cd.detectChanges();
  }

  private updateLineView() {
    if (!this.lineMeasureStart || !this.lineMeasureEnd) {
      this.currentSeparation = null;
      this.currentSeparationScaled = null;
      return;
    }

    this.currentSeparation = Math.sqrt(
      Math.pow(this.lineMeasureStart.x - this.lineMeasureEnd.x, 2) +
      Math.pow(this.lineMeasureStart.y - this.lineMeasureEnd.y, 2)
    );

    if (this.wcs && this.wcs.isValid()) {
      let raDec1 = this.wcs.pixToWorld([this.lineMeasureStart.x, this.lineMeasureStart.y]);
      let raDec2 = this.wcs.pixToWorld([this.lineMeasureEnd.x, this.lineMeasureEnd.y]);
      let phi1 = raDec1[1] * (Math.PI / 180.0);
      let phi2 = raDec2[1] * (Math.PI / 180.0);
      let deltaLambda = (raDec1[0] - raDec2[0]) * (Math.PI / 180.0);
      let deltaPhi = (raDec1[1] - raDec2[1]) * (Math.PI / 180.0);

      let separationScaled =
        2 *
        Math.asin(
          Math.sqrt(
            Math.pow(Math.sin(deltaPhi / 2), 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sin(deltaLambda / 2), 2)
          )
        );
      separationScaled *= 180.0 / Math.PI;
      let separationScaledUnits = 'degrees';
      if (separationScaled < 1.0) {
        separationScaled *= 60.0;
        separationScaledUnits = 'arcmins';
      }
      if (separationScaled < 1.0) {
        separationScaled *= 60.0;
        separationScaledUnits = 'arcsecs';
      }
      this.currentSeparationScaled = separationScaled;
      this.currentSeparationScaledUnits = separationScaledUnits;
    }
  }
}
