import { Component, OnInit, OnChanges, ViewChild, AfterViewInit, Input, ChangeDetectorRef } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/throttleTime';
import 'rxjs/add/operator/distinctUntilChanged';

declare let d3, nv: any;
import * as SVG from 'svgjs';
import { Point } from 'paper';

import { ImageFile, getPixel, getHasWcs, getWcs } from '../../../data-files/models/data-file';
import { NvD3Component } from 'ng2-nvd3';



@Component({
  selector: 'app-plotter',
  templateUrl: './plotter.component.html',
  styleUrls: ['./plotter.component.css']
})
export class PlotterComponent implements OnInit, OnChanges {
  @Input() imageFile: ImageFile;
  @Input() lineMeasureStart: {x: number, y: number};
  @Input() lineMeasureEnd: {x: number, y: number};
  @Input() interpolatePixels: boolean;

  @ViewChild(NvD3Component) nvD3: NvD3Component;

  
  private currentSeparation = null;
  private currentSeparationScaled = null;
  private currentSeparationScaledUnits = null;
  private crosshairX: number = null;
  private crosshairY: number = null;
  private chartOptions;
  private chartData = [];
  private chartDebouncer$: Subject<null> = new Subject();


  constructor(private cd: ChangeDetectorRef) {

  }

  ngOnInit() {
    let self = this;

     this.chartDebouncer$
     .debounceTime(200)
     .subscribe(value => {
       this.updateChart();
     });

     this.chartOptions = {
       chart: {
         type: 'lineChart',
         focusEnable: false,
         height: 200,
         showLegend: false,
         x: function(d){ return d.t; },
         y: function(d){ return d.v; },
         useInteractiveGuideline: true,
         isArea: true,
         yAxis: {
           //tickValues: [],
           showMaxMin: false,
         },
         xAxis: {
           //tickValues: [],
           showMaxMin: false
         },
         xScale: d3.scale.linear(),
         yScale: d3.scale.linear(),
         focusShowAxisX: false,
         noData: 'Cross-section not available',
         callback: this.onChartCreation.bind(this)
       }
     };

     this.chartDebouncer$.next();

  }

  ngOnChanges() {
    this.updateLineView();
    this.chartDebouncer$.next();
  }

  public getData() {
    return this.chartData.length == 0 ? null : this.chartData[0]
  }

  private onChartCreation() {
    let self = this;

    let onChartMouseMove = (xy) => {
      if(this.lineMeasureStart && this.lineMeasureEnd) {
        let xScale = self.nvD3.chart.xAxis.scale();
        let yScale = self.nvD3.chart.yAxis.scale();
        let t = xScale.invert(xy[0]);
        //let y = yScale.invert(xy[1]);

        let start = self.lineMeasureStart
        let end = self.lineMeasureEnd
        let v = {x: end.x-start.x, y: end.y-start.y};
        let vLength = Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));
        let vUnit = {x: v.x/vLength, y: v.y/vLength};

        //console.log(vUnit.x*t + start.x, vUnit.y*t + start.y);
        self.crosshairX = vUnit.x*t + start.x;
        self.crosshairY = vUnit.y*t + start.y;
        self.updateLineView();
        //self.nvD3.chart.xAxis.scale().invert(d3.event.offsetX), self.nvD3.chart.yAxis.scale().invert(d3.event.offsetY)
        //console.log('mouse over', e.mouseX, self.nvD3.chart.xAxis.scale().invert(e.mouseX));
      }
    }

    let onChartMouseOut = () => {
      self.crosshairX = null;
      self.crosshairY = null;
      self.updateLineView();
    }


    if(this.nvD3.svg) {
      this.nvD3.svg.select('.nv-linesWrap').on('mousemove.lines', function(e) {onChartMouseMove(d3.mouse(this))});
      this.nvD3.svg.select('.nv-background').on('mousemove.background', function(e) {onChartMouseMove(d3.mouse(this))});
      this.nvD3.svg.select('.nv-lineChart').on('mouseout.linechart', function(e) {onChartMouseOut()});
    }
  }

  private updateChart() {
    if(!this.imageFile || !this.lineMeasureStart || !this.lineMeasureEnd) {
      this.chartData = [];
      return;
    }

    let start = this.lineMeasureStart
    let end = this.lineMeasureEnd
    let v = {x: end.x-start.x, y: end.y-start.y};
    let vLength = Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));

    if(vLength == 0)  {
      this.chartData = [];
      return;
    }

    let vUnit = {x: v.x/vLength, y: v.y/vLength};

    let numPoints = 256;
    let spacing = vLength/numPoints;
    let result = new Array(numPoints);
    for(let i=0; i<numPoints; i++)  {
      let t = d3.round(i*spacing,1);
      let x = d3.round(start.x + vUnit.x*t,2);
      let y = d3.round(start.y + vUnit.y*t,2);
      result[i] = {x: x, y: y, t: t, v: d3.round(getPixel(this.imageFile, x, y, this.interpolatePixels),2), x0: x, y0: y}
    }

    this.chartData = [
      {
        values: result,
        key: 'cross-section',
        color: 'rgb(44, 44, 160)'
      }
    ];
    this.cd.detectChanges();
  }

  private updateLineView() {
    if(!this.imageFile || !this.lineMeasureStart || !this.lineMeasureEnd) { 
      this.currentSeparation = null;
      this.currentSeparationScaled = null;
      return;
    }

    this.currentSeparation = Math.sqrt(Math.pow(this.lineMeasureStart.x-this.lineMeasureEnd.x,2) + 
      Math.pow(this.lineMeasureStart.y-this.lineMeasureEnd.y,2));

    

    if(getHasWcs(this.imageFile)) {
      let wcs = getWcs(this.imageFile)
      let raDec1 = wcs.pixToWorld([this.lineMeasureStart.x, this.lineMeasureStart.y]);
      let raDec2 = wcs.pixToWorld([this.lineMeasureEnd.x, this.lineMeasureEnd.y]);
      let phi1 = raDec1[1] * (Math.PI/180.0);
      let phi2 = raDec2[1] * (Math.PI/180.0);
      let deltaLambda = (raDec1[0] - raDec2[0])*(Math.PI/180.0);
      let deltaPhi = (raDec1[1] - raDec2[1])*(Math.PI/180.0);

      let separationScaled = 2*Math.asin(Math.sqrt(Math.pow(Math.sin(deltaPhi/2), 2)+Math.cos(phi1)*Math.cos(phi2)*Math.pow(Math.sin(deltaLambda/2),2)))
      separationScaled *= (180.0/Math.PI);
      let separationScaledUnits = 'degrees';
      if(separationScaled < 1.0) {
        separationScaled *= 60.0;
        separationScaledUnits = 'arcmins';
      }
      if(separationScaled < 1.0) {
        separationScaled *= 60.0;
        separationScaledUnits = 'arcsecs';
      }
      this.currentSeparationScaled = separationScaled;
      this.currentSeparationScaledUnits = separationScaledUnits;
  
    }

    
  }


  

}
