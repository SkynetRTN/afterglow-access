import { Component, OnInit, Input, Output, EventEmitter, SimpleChange, OnChanges } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../../reducers';
import * as fromCore from '../../../reducers';
import * as fromDataFiles from '../../../../data-files/reducers';
import { Dictionary } from '@ngrx/entity/src/models';
import { DataFile, getHasWcs, ImageFile, getWcs, getWidth, getHeight, getDegsPerPixel, getCenterTime } from '../../../../data-files/models/data-file';
import { ImageFileState } from '../../../models/image-file-state';
import { Marker, LineMarker, MarkerType, TeardropMarker, CircleMarker, RectangleMarker } from '../../../models/marker';
import { BehaviorSubject, Subject } from 'rxjs';
import { CanvasMouseEvent } from '../../../components/pan-zoom-canvas/pan-zoom-canvas.component';
import { MarkerMouseEvent } from '../../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { WorkbenchTool } from '../../../models/workbench-state';
import { SonifierRegionMode } from '../../../models/sonifier-file-state';
import { Source, PosType } from '../../../models/source';
import { PlotterFileState } from '../../../models/plotter-file-state';

@Component({
  selector: 'app-workbench-viewer-panel',
  templateUrl: './workbench-viewer-panel.component.html',
  styleUrls: ['./workbench-viewer-panel.component.css']
})
export class WorkbenchViewerPanelComponent implements OnInit, OnChanges {
  @Input() fileId: string;
  private fileId$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  @Input() showInfoBar: boolean = true;

  @Output() onImageClick = new EventEmitter<CanvasMouseEvent>();
  @Output() onImageMove = new EventEmitter<CanvasMouseEvent>();
  @Output() onMarkerClick = new EventEmitter<MarkerMouseEvent>();

  markerLayers$: Observable<Array<Marker[]>>;

  sourceMarkersLayer$: Observable<Marker[]>;
  sourceExtractorRegionMarkerLayer$: Observable<Marker[]>;

  files$: Observable<Dictionary<DataFile>>;
  sources$: Observable<Source[]>;
  selectedSources$: Observable<Source[]>;
  showAllSources$: Observable<boolean>;
  activeFileState$: Observable<ImageFileState>;
  imageMouseX: number = null;
  imageMouseY: number = null;


  constructor(private store: Store<fromRoot.State>) {
    this.files$ = this.store.select(fromDataFiles.getDataFiles);
    this.sources$ = this.store.select(fromCore.getAllSources);
    this.selectedSources$ = this.store.select(fromCore.getSelectedSources);
    this.showAllSources$ = this.store.select(fromCore.workbench.getShowAllSources).distinctUntilChanged();

    this.activeFileState$ = Observable.combineLatest(
      this.fileId$,
      this.store.select(fromCore.getImageFileStates)
    )
    .map(([fileId, imageFileStates]) => imageFileStates[fileId])
    .filter(state => state !== undefined && state !== null);


    let lineStart$ = this.activeFileState$
    .map(state => state.plotter.lineMeasureStart)
    .distinctUntilChanged();

    let lineEnd$ = this.activeFileState$
    .map(state => state.plotter.lineMeasureEnd)
    .distinctUntilChanged();

    let plotterMarkerLayers$ = Observable.combineLatest(this.fileId$, this.files$, lineStart$, lineEnd$)
      .map(([fileId, files, lineMeasureStart, lineMeasureEnd]) => {
        if (!lineMeasureStart || !lineMeasureEnd) return [[]];

        let file = files[this.fileId] as ImageFile;

        if(!file) return [[]];

        let startPrimaryCoord = lineMeasureStart.primaryCoord;
        let startSecondaryCoord = lineMeasureStart.secondaryCoord;
        let startPosType = lineMeasureStart.posType;
        let endPrimaryCoord = lineMeasureEnd.primaryCoord;
        let endSecondaryCoord = lineMeasureEnd.secondaryCoord;
        let endPosType = lineMeasureEnd.posType;
    
        let x1 = startPrimaryCoord;
        let y1 = startSecondaryCoord;
        let x2 = endPrimaryCoord;
        let y2 = endSecondaryCoord;

        if ((startPosType == PosType.SKY || endPosType == PosType.SKY))  {
          if (!file.headerLoaded || !getHasWcs(file)) return [[]];
          let wcs = getWcs(file);
          if(startPosType == PosType.SKY) {
            let xy = wcs.worldToPix([startPrimaryCoord, startSecondaryCoord]);
            x1 = Math.max(Math.min(xy[0], getWidth(file)), 0);
            y1 = Math.max(Math.min(xy[1], getHeight(file)), 0)
            
          }

          if(endPosType == PosType.SKY) {
            let xy = wcs.worldToPix([endPrimaryCoord, endSecondaryCoord]);
            x2 = Math.max(Math.min(xy[0], getWidth(file)), 0);
            y2 = Math.max(Math.min(xy[1], getHeight(file)), 0)
          }
        }

        
        return [[{
          type: MarkerType.LINE,
          x1: x1,
          y1: y1,
          x2: x2,
          y2: y2
        } as LineMarker]];
      });

    let sonifierMarkerLayers$ = Observable.combineLatest(this.activeFileState$
      .map(state => state.sonifier.region)
      .distinctUntilChanged(),
      this.activeFileState$
        .map(state => state.sonifier.regionMode)
        .distinctUntilChanged(),
        this.activeFileState$
        .map(state => state.sonifier.progressLine)
        .distinctUntilChanged())
      .map(([region, regionMode, progressLine]) => {
        let result = [];
        if (region && regionMode == SonifierRegionMode.CUSTOM) result.push([{ type: MarkerType.RECTANGLE, ...region } as RectangleMarker]);
        if (progressLine) result.push([{ type: MarkerType.LINE, ...progressLine } as LineMarker])
        return result;
      });

    // let sourceExtractorMarkerLayers$ = Observable.combineLatest(
    //   this.imageFileStates$
    //     .map(imageFileStates => imageFileStates[this.fileId].sourceExtractor.region)
    //     .distinctUntilChanged()
    //     .map(region => {
    //       if (!region) return [];
    //       return [{ type: MarkerType.RECTANGLE, ...region } as RectangleMarker];
    //     }),
    //   Observable.combineLatest(
    //     this.imageFileStates$
    //       .map(imageFileStates => imageFileStates[this.fileId].sourceExtractor.sources)
    //       .distinctUntilChanged(),
    //     this.imageFileStates$
    //       .map(imageFileStates => imageFileStates[this.fileId].sourceExtractor.selectedSourceIds)
    //       .distinctUntilChanged())
    //     .map(([sources, selectedSourceIds]) => {
    //       if (!sources || !selectedSourceIds) return [];

    //       let sourceExtractor
    //       return sources.map(source => {
    //         if(source.skyPm || source.pixelPm) {
    //           return {
    //             type: MarkerType.TEARDROP,
    //             x: source.x,
    //             y: source.y,
    //             radius: 15,
    //             theta: source.pixelPmPosAngle,
    //             selected: selectedSourceIds.find(selectedSourceId => selectedSourceId == source.id) != null,
    //             data: { id: source.id }
    //           } as TeardropMarker
    //         }
    //         else {
    //           return {
    //             type: MarkerType.CIRCLE,
    //             x: source.x,
    //             y: source.y,
    //             radius: 15,
    //             selected: selectedSourceIds.find(selectedSourceId => selectedSourceId == source.id) != null,
    //             data: { id: source.id }
    //           } as CircleMarker
    //         }

    //       });
    //     })
    // );


    let sourceMarkerLayers$ = Observable.combineLatest(this.fileId$, this.files$, this.showAllSources$, this.sources$, this.selectedSources$)
      .map(([fileId, files, showAllSources, sources, selectedSources]) => {
        if (fileId === null) return [[]];
        let markers = [];
        let file = files[fileId] as ImageFile;
        if(!file) return [[]];
        sources.forEach(source => {
          let primaryCoord = source.primaryCoord;
          let secondaryCoord = source.secondaryCoord;
          let pm = source.pm;
          let posAngle = source.pmPosAngle;
          let epoch = source.pmEpoch;
          let selected = selectedSources.includes(source);

          if (pm) {
            if (!file.headerLoaded) return;
            let fileEpoch = getCenterTime(file);
            if (!fileEpoch) return;

            let deltaT = (fileEpoch.getTime() - epoch.getTime()) / 1000.0;
            let primaryRate = source.pm * Math.sin(source.pmPosAngle * Math.PI / 180.0);
            let secondaryRate = source.pm * Math.cos(source.pmPosAngle * Math.PI / 180.0);

            secondaryCoord += (secondaryRate * deltaT)/3600;
            primaryCoord += (primaryRate * deltaT)/3600/15 * (source.posType == PosType.PIXEL ? 1 : Math.cos(secondaryCoord*Math.PI/180));

          }

          if (source.fileId != fileId && !showAllSources) return;

          let x = primaryCoord;
          let y = secondaryCoord;
          let theta = posAngle;

          if (source.posType == PosType.SKY) {
            if (!file.headerLoaded || !getHasWcs(file)) return;
            let wcs = getWcs(file);
            let xy = wcs.worldToPix([primaryCoord, secondaryCoord]);
            x = xy[0];
            y = xy[1];
            if (x < 0.5 || x >= getWidth(file) + 0.5 || y < 0.5 || y >= getHeight(file) + 0.5) return;

            if(pm) {
              theta = posAngle + wcs.positionAngle();
              theta = theta % 360;
              if (theta < 0) theta += 360;
            }
          }


          if (pm) {
            markers.push({
              type: MarkerType.TEARDROP,
              x: x,
              y: y,
              radius: 15,
              theta: theta,
              selected: selected,
              data: { id: source.id }
            } as TeardropMarker)
          }
          else {
            markers.push({
              type: MarkerType.CIRCLE,
              x: x,
              y: y,
              radius: 15,
              selected: selected,
              data: { id: source.id }
            } as CircleMarker);
          }
        })

        return [markers];
      })




    this.markerLayers$ = Observable.combineLatest(
      this.store.select(fromCore.workbench.getActiveTool),
      plotterMarkerLayers$,
      sonifierMarkerLayers$,
      sourceMarkerLayers$
    )
      .map(([activeTool, plotterMarkerLayers, sonifierMarkerLayers, sourceMarkerLayers]) => {
        if (!this.fileId) return [[]];

        if (activeTool == WorkbenchTool.PLOTTER) {
          return plotterMarkerLayers;
        }
        else if (activeTool == WorkbenchTool.SONIFIER) {
          return sonifierMarkerLayers;
        }
        else if (activeTool == WorkbenchTool.SOURCE_EXTRACTOR) {
          return sourceMarkerLayers;
        }

        return [[]];
      })
  }

  ngOnInit() {
  }

  ngOnChanges(changes: { [key: string]: SimpleChange }) {

    if (changes.hasOwnProperty('fileId')) {
      this.fileId$.next(changes['fileId'].currentValue);
    }
  }

  handleImageMove($event: CanvasMouseEvent) {
    if ($event.hitImage) {
      this.imageMouseX = $event.imageX;
      this.imageMouseY = $event.imageY;
    }
    else {
      this.imageMouseX = null;
      this.imageMouseY = null;
    }

    this.onImageMove.emit($event);
  }

  handleImageClick($event: CanvasMouseEvent) {
    this.onImageClick.emit($event);
  }

  handleMarkerClick($event: MarkerMouseEvent) {
    this.onMarkerClick.emit($event);
  }

}
