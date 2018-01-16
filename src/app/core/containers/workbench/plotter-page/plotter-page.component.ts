import { Component, AfterViewInit, OnDestroy, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/observable/of';

import * as SVG from 'svgjs'

import * as fromRoot from '../../../../reducers';
import { ImageFile, getHasWcs, getWcs } from '../../../../data-files/models/data-file'

import * as fromCore from '../../../reducers';
import * as fromWorkbench from '../../../reducers/workbench'
import * as workbenchActions from '../../../actions/workbench';
import { ViewerFileState } from '../../../models/viewer-file-state';
import { PlotterFileState } from '../../../models/plotter-file-state';
import { PlotterComponent } from '../../../components/plotter/plotter.component';
import { ViewportChangeEvent, ViewerMouseEvent } from '../../../components/pan-zoom-viewer/pan-zoom-viewer.component';

@Component({
  selector: 'app-plotter-page',
  templateUrl: './plotter-page.component.html',
  styleUrls: ['./plotter-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlotterPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('plotter') plotter: PlotterComponent;
  workbenchState$: Observable<fromWorkbench.State>;
  imageFile$: Observable<ImageFile>;
  viewerState$: Observable<ViewerFileState>;
  plotterState$: Observable<PlotterFileState>;
  line$: Observable<{x1: number, y1: number, x2: number, y2: number}> = null;
  lineLengthPixels$: Observable<number>;
  lineLengthScaled$: Observable<{value: number, units: string}>;
  lastImageFile: ImageFile;
  lastViewerState: ViewerFileState;
  lastPlotterState: PlotterFileState;
  lastWorkbenchState: fromWorkbench.State;
  stateSub: Subscription;
  


  constructor(private store: Store<fromRoot.State>) {
    let selectedFileWorkspaceState$ = store.select(fromCore.getSelectedFileWorkbenchState).filter(state => state !== null && state !== undefined);
    this.imageFile$ = selectedFileWorkspaceState$.map(state => state.file);
    this.workbenchState$ = selectedFileWorkspaceState$.map(state => state.workbenchState);
    this.viewerState$ = selectedFileWorkspaceState$.map(state => state.fileState.viewer);
    this.plotterState$ = selectedFileWorkspaceState$.map(state => state.fileState.plotter);

    this.line$ = this.plotterState$
    .distinctUntilChanged((a,b) => {
      return a.lineMeasureStart == b.lineMeasureStart && a.lineMeasureEnd == b.lineMeasureEnd;
    })
    .map(state => {
      if(!state.lineMeasureStart || !state.lineMeasureEnd) return null;
      return {x1: state.lineMeasureStart.x, y1: state.lineMeasureStart.y, x2: state.lineMeasureEnd.x, y2: state.lineMeasureEnd.y}
    })

    this.lineLengthPixels$ = this.line$
    .filter(line => line !== null)
    .withLatestFrom(this.imageFile$)
    .map(([line, imageFile]) => {
      return Math.sqrt(Math.pow(line.x1-line.x2,2) + Math.pow(line.y1-line.y2,2));
    });

    this.lineLengthScaled$ = this.line$
    .filter(line => line !== null)
    .withLatestFrom(this.imageFile$)
    .map(([line, imageFile]) => {
      if(!imageFile || !getHasWcs(imageFile)) return null;
      
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

    this.stateSub = selectedFileWorkspaceState$.subscribe(state => {
      this.lastImageFile = state && state.file;
      this.lastWorkbenchState = state && state.workbenchState;
      this.lastViewerState = state && state.fileState && state.fileState.viewer;
      this.lastPlotterState = state && state.fileState && state.fileState.plotter;
    });
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
    if(this.stateSub) this.stateSub.unsubscribe();
  }

  onImageMove($event: ViewerMouseEvent) {
    if(this.lastPlotterState.measuring) {
      let x = $event.imageX;
      let y = $event.imageY;
      this.store.dispatch(new workbenchActions.UpdatePlotterLine({file: this.lastImageFile, point: {x: x, y: y}}));
    }
    
  }

  onImageClick($event: ViewerMouseEvent) {
    let x = $event.imageX;
    let y = $event.imageY;
    this.store.dispatch(new workbenchActions.StartPlotterLine({file: this.lastImageFile, point: {x: x, y: y}}));
  }

  onCentroidClicksChange($event) {
    this.store.dispatch(new workbenchActions.UpdatePlotterFileState({file: this.lastImageFile, changes: {centroidClicks: $event.checked}}));
  }

   onInterpolatePixelsChange($event) {
    this.store.dispatch(new workbenchActions.UpdatePlotterFileState({file: this.lastImageFile, changes: {interpolatePixels: $event.checked}}));
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
