import { Component, AfterViewInit, OnDestroy, ViewChild, ChangeDetectionStrategy } from '@angular/core';

import { Store } from '@ngrx/store';
import * as SVG from 'svgjs'
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/observable/of';

import { ImageFile, getHasWcs, getWcs } from '../../../../data-files/models/data-file'
import { ViewerFileState } from '../../../models/viewer-file-state';
import { PlotterFileState } from '../../../models/plotter-file-state';
import { PlotterComponent } from '../../../components/plotter/plotter.component';
import { ViewportChangeEvent, ViewerMouseEvent } from '../../../components/pan-zoom-viewer/pan-zoom-viewer.component';
import { PlotterSettings } from '../../../models/plotter-settings';
import { CentroidSettings } from '../../../models/centroid-settings';

import * as fromRoot from '../../../../reducers';
import * as fromCore from '../../../reducers';
import * as fromWorkbench from '../../../reducers/workbench'
import * as workbenchActions from '../../../actions/workbench';
import * as plotterActions from '../../../actions/plotter';

@Component({
  selector: 'app-plotter-page',
  templateUrl: './plotter-page.component.html',
  styleUrls: ['./plotter-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlotterPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('plotter') plotter: PlotterComponent;
  imageFile$: Observable<ImageFile>;
  viewerState$: Observable<ViewerFileState>;
  showConfig$: Observable<boolean>;
  plotterSettings$: Observable<PlotterSettings>;
  centroidSettings$: Observable<CentroidSettings>;
  plotterState$: Observable<PlotterFileState>;
  line$: Observable<{x1: number, y1: number, x2: number, y2: number}> = null;
  lineLengthPixels$: Observable<number>;
  lineLengthScaled$: Observable<{value: number, units: string}>;
  lineAngle$: Observable<number>;
  lastImageFile: ImageFile;
  lastViewerState: ViewerFileState;
  lastPlotterState: PlotterFileState;
  subs: Subscription[] = [];
  


  constructor(private store: Store<fromRoot.State>) {
    this.imageFile$ = store.select(fromCore.workbench.getImageFile);
    let plotterGlobalState$ = store.select(fromCore.getPlotterGlobalState);
    this.plotterSettings$ = plotterGlobalState$.map(state => state && state.plotterSettings);
    this.centroidSettings$ = plotterGlobalState$.map(state => state &&  state.centroidSettings);
    this.viewerState$ = store.select(fromCore.workbench.getViewerFileState);
    this.plotterState$ = store.select(fromCore.workbench.getPlotterFileState).filter(v => v != null);
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);
    

    this.line$ = this.plotterState$
    .distinctUntilChanged((a,b) => {
      return a.lineMeasureStart == b.lineMeasureStart && a.lineMeasureEnd == b.lineMeasureEnd;
    })
    .map(state => {
      if(!state.lineMeasureStart || !state.lineMeasureEnd) return null;
      return {x1: state.lineMeasureStart.x, y1: state.lineMeasureStart.y, x2: state.lineMeasureEnd.x, y2: state.lineMeasureEnd.y}
    })

    this.lineLengthPixels$ = this.line$
    .withLatestFrom(this.imageFile$)
    .map(([line, imageFile]) => {
      if(!line || !imageFile) return null;
      return Math.sqrt(Math.pow(line.x1-line.x2,2) + Math.pow(line.y1-line.y2,2));
    });

    this.lineLengthScaled$ = this.line$
    .withLatestFrom(this.imageFile$)
    .map(([line, imageFile]) => {
      if(!line || !imageFile || !getHasWcs(imageFile)) return null;
      
      let wcs = getWcs(imageFile);
      let raDec1 = wcs.pixToWorld([line.x1, line.y1]);
      let raDec2 = wcs.pixToWorld([line.x2, line.y2]);
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
      return {value: separationScaled, units: separationScaledUnits};
    });

    this.lineAngle$ = this.line$
      .filter(line => line !== null)
      .withLatestFrom(this.imageFile$)
      .map(([line, imageFile]) => {
        return (Math.atan2(line.x2-line.x1, line.y1-line.y2) * 180.0/Math.PI + 360) % 360;
    });

    this.subs.push(this.imageFile$.subscribe(imageFile => this.lastImageFile = imageFile));
    this.subs.push(this.viewerState$.subscribe(viewerState => this.lastViewerState = viewerState));
    this.subs.push(this.plotterState$.subscribe(plotterState => this.lastPlotterState = plotterState));

  }
    

  ngAfterViewInit() {
    // this.stateSubscription = this.state$.subscribe(state => {

    //   this.lineLengthPixels = Math.sqrt(Math.pow(state.lineMeasureStart.x-state.lineMeasureEnd.x,2) + 
    //     Math.pow(state.lineMeasureStart.y-state.lineMeasureEnd.y,2));

    //   if(this.imageFile && this.imageFile.hasWcs) {
    //     let raDec1 = this.imageFile.wcs.pixToWorld([state.lineMeasureStart.x, state.lineMeasureStart.y]);
        
    //     let raDec2 = this.imageFile.wcs.pixToWorld([state.lineMeasureEnd.x, state.lineMeasureEnd.y]);
    //     let phi1 = raDec1[1] * (Math.PI/180.0);
    //     let phi2 = raDec2[1] * (Math.PI/180.0);
    //     let deltaLambda = (raDec1[0] - raDec2[0])*(Math.PI/180.0);
    //     let deltaPhi = (raDec1[1] - raDec2[1])*(Math.PI/180.0);

    //     let separationScaled = 2*Math.asin(Math.sqrt(Math.pow(Math.sin(deltaPhi/2), 2)+Math.cos(phi1)*Math.cos(phi2)*Math.pow(Math.sin(deltaLambda/2),2)))
    //     separationScaled *= (180.0/Math.PI);
    //     let separationScaledUnits = 'degrees';
    //     if(separationScaled < 1.0) {
    //       separationScaled *= 60.0;
    //       separationScaledUnits = 'arcmins';
    //     }
    //     if(separationScaled < 1.0) {
    //       separationScaled *= 60.0;
    //       separationScaledUnits = 'arcsecs';
    //     }
    //     this.lineLengthScaled = separationScaled;
    //     this.lineLengthScaledUnits = separationScaledUnits;
    //   }




    // });


  }


  ngOnChanges() {

  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  onImageMove($event: ViewerMouseEvent) {
    if(this.lastPlotterState.measuring) {
      let x = $event.imageX;
      let y = $event.imageY;
      this.store.dispatch(new plotterActions.UpdateLine({file: this.lastImageFile, point: {x: x, y: y}}));
    }
    
  }

  onImageClick($event: ViewerMouseEvent) {
    let x = $event.imageX;
    let y = $event.imageY;
    this.store.dispatch(new plotterActions.StartLine({file: this.lastImageFile, point: {x: x, y: y}}));
  }

  onCentroidClicksChange($event) {
    this.store.dispatch(new plotterActions.UpdateCentroidSettings({changes: {centroidClicks: $event.checked}}));
  }

  onPlanetCentroidingChange($event) {
    this.store.dispatch(new plotterActions.UpdateCentroidSettings({changes: {useDiskCentroiding: $event.checked}}));
  }

   onInterpolatePixelsChange($event) {
    this.store.dispatch(new plotterActions.UpdatePlotterSettings({changes: {interpolatePixels: $event.checked}}));
  }

  // onCentroidLineClick() {
  //   let chartData = this.plotter.getData();
  //   if(!chartData || !this.imageFile) return;
    
  //   //find max value along line
  //   let maxValue = null;
  //   for(let i=0; i<chartData.values.length; i++) {
  //     let value = chartData.values[i];
  //     if(maxValue != null && value.v <= maxValue.v) continue;
  //     maxValue = value;
  //   }

  //   if(maxValue == null) return;

  //   this.plotterStore.centroidLine({x: maxValue.x, y: maxValue.y})
    

  // }

}
