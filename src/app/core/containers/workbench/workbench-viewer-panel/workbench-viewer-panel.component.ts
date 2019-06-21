import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  SimpleChange,
  OnChanges,
  ViewChild,
  ElementRef
} from "@angular/core";

import {
  DomSanitizer, SafeValue
} from '@angular/platform-browser';

import { Observable, combineLatest } from "rxjs";
import { distinctUntilChanged, map, filter } from "rxjs/operators";
import { Store, select } from "@ngrx/store";

import * as fromRoot from "../../../../reducers";
import * as fromCore from "../../../reducers";
import * as fromDataFiles from "../../../../data-files/reducers";
import { Dictionary } from "@ngrx/entity/src/models";
import {
  DataFile,
  getHasWcs,
  ImageFile,
  getWcs,
  getWidth,
  getHeight,
  getDegsPerPixel,
  getCenterTime
} from "../../../../data-files/models/data-file";
import { ImageFileState } from "../../../models/image-file-state";
import {
  Marker,
  LineMarker,
  MarkerType,
  TeardropMarker,
  CircleMarker,
  RectangleMarker
} from "../../../models/marker";
import { BehaviorSubject, Subject } from "rxjs";
import {
  CanvasMouseEvent,
  PanZoomCanvasComponent
} from "../../../components/pan-zoom-canvas/pan-zoom-canvas.component";
import {
  MarkerMouseEvent,
  ImageViewerMarkerOverlayComponent
} from "../../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component";
import { WorkbenchTool } from "../../../models/workbench-state";
import { SonifierRegionMode } from "../../../models/sonifier-file-state";
import { Source, PosType } from "../../../models/source";
import { PlotterFileState } from "../../../models/plotter-file-state";
import { min } from "../../../../../../node_modules/rxjs/operators";
import { CustomMarker } from "../../../models/custom-marker";
import { FieldCal } from '../../../models/field-cal';

@Component({
  selector: "app-workbench-viewer-panel",
  templateUrl: "./workbench-viewer-panel.component.html",
  styleUrls: ["./workbench-viewer-panel.component.scss"]
})
export class WorkbenchViewerPanelComponent implements OnInit, OnChanges {
  @Input()
  fileId: string;
  private fileId$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  @Input()
  showInfoBar: boolean = true;
  @Input()
  active: boolean = true;

  @Output()
  onImageClick = new EventEmitter<CanvasMouseEvent>();
  @Output()
  onImageMove = new EventEmitter<CanvasMouseEvent>();
  @Output()
  onMarkerClick = new EventEmitter<MarkerMouseEvent>();

  @ViewChild(PanZoomCanvasComponent)
  panZoomCanvasComponent: PanZoomCanvasComponent;

  @ViewChild(ImageViewerMarkerOverlayComponent)
  imageViewerMarkerOverlayComponent: ImageViewerMarkerOverlayComponent;

  markers$: Observable<Marker[]>;

  sourceMarkersLayer$: Observable<Marker[]>;
  sourceExtractorRegionMarkerLayer$: Observable<Marker[]>;

  files$: Observable<Dictionary<DataFile>>;
  sources$: Observable<Source[]>;
  customMarkers$: Observable<CustomMarker[]>;
  selectedCustomMarkers$: Observable<CustomMarker[]>;
  selectedSources$: Observable<Source[]>;
  showAllSources$: Observable<boolean>;
  activeFileState$: Observable<ImageFileState>;
  imageMouseX: number = null;
  imageMouseY: number = null;

  fieldCals$: Observable<FieldCal[]>;
  selectedFieldCal$: Observable<FieldCal>;
  selectedFieldCalId$: Observable<string>;
  fieldCalMarkers$: Observable<Marker[]>;

  constructor(private store: Store<fromRoot.State>, private sanitization:DomSanitizer) {
    this.files$ = this.store.select(fromDataFiles.getDataFiles);
    this.sources$ = this.store.select(fromCore.getAllSources);
    this.customMarkers$ = this.store.select(fromCore.getAllCustomMarkers);
    this.selectedCustomMarkers$ = this.store.select(
      fromCore.getSelectedCustomMarkers
    );
    this.selectedSources$ = this.store.select(fromCore.getSelectedSources);
    this.showAllSources$ = this.store
      .select(fromCore.workbench.getShowAllSources)
      .pipe(distinctUntilChanged());

    this.activeFileState$ = combineLatest(
      this.fileId$,
      store.select(fromCore.getImageFileStates)
    ).pipe(
      map(([fileId, imageFileStates]) => imageFileStates[fileId]),
      filter(state => state !== undefined && state !== null)
    );

    let lineStart$ = this.activeFileState$.pipe(
      map(state => state.plotter.lineMeasureStart),
      distinctUntilChanged()
    );

    let lineEnd$ = this.activeFileState$.pipe(
      map(state => state.plotter.lineMeasureEnd),
      distinctUntilChanged()
    );

    let plotterMarkers$ = combineLatest(
      this.fileId$,
      this.files$,
      lineStart$,
      lineEnd$,
      this.store.select(fromCore.getWorkbenchState)
    ).pipe(
      map(([fileId, files, lineMeasureStart, lineMeasureEnd, workbenchState]) => {
        if (!lineMeasureStart || !lineMeasureEnd) return [[]];

        let file = files[this.fileId] as ImageFile;

        if (!file) return [[]];

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

        if (startPosType == PosType.SKY || endPosType == PosType.SKY) {
          if (!file.headerLoaded || !getHasWcs(file)) return [[]];
          let wcs = getWcs(file);
          if (startPosType == PosType.SKY) {
            let xy = wcs.worldToPix([startPrimaryCoord, startSecondaryCoord]);
            x1 = Math.max(Math.min(xy[0], getWidth(file)), 0);
            y1 = Math.max(Math.min(xy[1], getHeight(file)), 0);
          }

          if (endPosType == PosType.SKY) {
            let xy = wcs.worldToPix([endPrimaryCoord, endSecondaryCoord]);
            x2 = Math.max(Math.min(xy[0], getWidth(file)), 0);
            y2 = Math.max(Math.min(xy[1], getHeight(file)), 0);
          }
        }

        if(workbenchState.plotterMode == '1D') {
          return [
            {
              type: MarkerType.LINE,
              x1: x1,
              y1: y1,
              x2: x2,
              y2: y2
            } as LineMarker
          ];
        }
        else {
          return [
            {
              type: MarkerType.RECTANGLE,
              x: Math.min(x1, x2),
              y: Math.min(y1, y2),
              width: Math.abs(x2-x1),
              height: Math.abs(y2-y1)
            } as RectangleMarker
          ]; 
        }
        
      })
    );

    let sonifierMarkers$ = combineLatest(
      this.activeFileState$.pipe(
        map(state => state.sonifier.region),
        distinctUntilChanged()
      ),

      this.activeFileState$.pipe(
        map(state => state.sonifier.regionMode),
        distinctUntilChanged()
      ),

      this.activeFileState$.pipe(
        map(state => state.sonifier.progressLine),
        distinctUntilChanged()
      )
    ).pipe(
      map(([region, regionMode, progressLine]) => {
        let result: Array<RectangleMarker | LineMarker> = [];
        if (region && regionMode == SonifierRegionMode.CUSTOM)
          result.push({
            type: MarkerType.RECTANGLE,
            ...region
          } as RectangleMarker);
        if (progressLine)
          result.push({ type: MarkerType.LINE, ...progressLine } as LineMarker);
        return result;
      })
    );

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

    let sourceMarkers$ = combineLatest(
      this.fileId$,
      this.files$,
      this.showAllSources$,
      this.sources$,
      this.selectedSources$
    ).pipe(
      map(([fileId, files, showAllSources, sources, selectedSources]) => {
        if (fileId === null) return [[]];
        let markers: Array<CircleMarker | TeardropMarker> = [];
        let file = files[fileId] as ImageFile;
        if (!file) return [[]];
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
            let mu = (source.pm * deltaT) / 3600.0;
            let theta = source.pmPosAngle * (Math.PI / 180.0);
            let cd = Math.cos((secondaryCoord * Math.PI) / 180);

            primaryCoord += (mu * Math.sin(theta)) / cd / 15;
            primaryCoord = primaryCoord % 360;
            secondaryCoord += mu * Math.cos(theta);
            secondaryCoord = Math.max(-90, Math.min(90, secondaryCoord));

            // primaryCoord += (primaryRate * deltaT)/3600/15 * (source.posType == PosType.PIXEL ? 1 : Math.cos(secondaryCoord*Math.PI/180));
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
            if (
              x < 0.5 ||
              x >= getWidth(file) + 0.5 ||
              y < 0.5 ||
              y >= getHeight(file) + 0.5
            )
              return;

            if (pm) {
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
              labelGap: 14,
              labelTheta: 0,
              theta: theta,
              selected: selected,
              data: { id: source.id }
            } as TeardropMarker);
          } else {
            markers.push({
              type: MarkerType.CIRCLE,
              x: x,
              y: y,
              radius: 15,
              labelGap: 14,
              labelTheta: 0,
              selected: selected,
              data: { id: source.id }
            } as CircleMarker);
          }
        });

        return markers;
      })
    );

    this.fieldCals$ = store.select(fromCore.getWorkbenchState).pipe(map(state => state.fieldCals));
    this.selectedFieldCalId$ = store.select(fromCore.getWorkbenchState).pipe(map(state => state.selectedFieldCalId));
    this.selectedFieldCal$ = combineLatest(this.fieldCals$, this.selectedFieldCalId$).pipe(
      map(([fieldCals, selectedFieldCalId]) => {
        if(!fieldCals || selectedFieldCalId == null) return null;
        let selectedFieldCal = fieldCals.find(fieldCal => fieldCal.id == selectedFieldCalId);
        if(!selectedFieldCal) return null;
        return selectedFieldCal; 
      })
    );


    let fieldCalMarkers$ = combineLatest(
      this.fileId$,
      this.files$,
      this.selectedFieldCal$
    ).pipe(
      map(([fileId, files, fieldCal]) => {
        if (fileId === null || fieldCal == null) return [[]];
        let markers: Array<CircleMarker> = [];
        let file = files[fileId] as ImageFile;
        if (!file || !file.headerLoaded || !getHasWcs(file)) return [[]];

              
        fieldCal.catalogSources.forEach(source => {
          let primaryCoord = source.primaryCoord;
          let secondaryCoord = source.secondaryCoord;
          // let selected = selectedSources.includes(source);
          let selected = false;

          let wcs = getWcs(file);
          let xy = wcs.worldToPix([primaryCoord, secondaryCoord]);
          let x = xy[0];
          let y = xy[1];
          if (
            x < 0.5 ||
            x >= getWidth(file) + 0.5 ||
            y < 0.5 ||
            y >= getHeight(file) + 0.5
          ) return;

          markers.push({
            type: MarkerType.CIRCLE,
            x: x,
            y: y,
            radius: 15,
            labelGap: 14,
            labelTheta: 0,
            selected: selected,
            data: { id: source.id }
          } as CircleMarker);


        });

        return markers;
      })
    );

    let customMarkers$ = combineLatest(
      this.store.select(fromCore.workbench.getActiveTool),
      this.fileId$,
      this.files$,
      this.customMarkers$,
      this.selectedCustomMarkers$
    ).pipe(
      map(
        ([activeTool, fileId, files, customMarkers, selectedCustomMarkers]) => {
          if (fileId === null) return [[]];
          let markers: Array<Marker> = [];
          let file = files[fileId] as ImageFile;
          if (!file) return [[]];
          markers = customMarkers
            .filter(customMarker => customMarker.fileId == file.id)
            .map(customMarker => {
              let marker = {
                ...customMarker.marker,
                data: { id: customMarker.id },
                selected:
                  activeTool == WorkbenchTool.CUSTOM_MARKER &&
                  selectedCustomMarkers.includes(customMarker)
              };
              return marker;
            });
            
          return markers;
        }
      )
    );

    this.markers$ = combineLatest(
      this.store.select(fromCore.workbench.getActiveTool),
      plotterMarkers$,
      sonifierMarkers$,
      sourceMarkers$,
      customMarkers$,
      fieldCalMarkers$
    ).pipe(
      map(
        ([
          activeTool,
          plotterMarkers,
          sonifierMarkers,
          sourceMarkers,
          customMarkers,
          fieldCalMarkers
        ]) => {
          if (!this.fileId) return [];
          let markers = [];
          if (activeTool == WorkbenchTool.PLOTTER) {
            markers.push(...plotterMarkers);
          }
          if (activeTool == WorkbenchTool.SONIFIER) {
            markers.push(...sonifierMarkers);
          }
          if (activeTool == WorkbenchTool.SOURCE_EXTRACTOR) {
            markers.push(...sourceMarkers);
          }
          if (activeTool != WorkbenchTool.SOURCE_EXTRACTOR) {
            markers.push(...customMarkers);
          }
          if (activeTool == WorkbenchTool.FIELD_CAL) {
            markers.push(...fieldCalMarkers);
          }
          return markers;
        }
      )
    );
  }

  ngOnInit() {}

  ngOnChanges(changes: { [key: string]: SimpleChange }) {
    if (changes.hasOwnProperty("fileId")) {
      this.fileId$.next(changes["fileId"].currentValue);
    }
  }

  handleImageMove($event: CanvasMouseEvent) {
    if ($event.hitImage) {
      this.imageMouseX = $event.imageX;
      this.imageMouseY = $event.imageY;
    } else {
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

  handleDownloadSnapshot() {
    let imageCanvas = this.panZoomCanvasComponent.canvas;
    
    // http://svgopen.org/2010/papers/62-From_SVG_to_Canvas_and_Back/
    let markerSvg = this.imageViewerMarkerOverlayComponent.svg;
    let svgXml = (new XMLSerializer()).serializeToString(markerSvg);

    let data = "data:image/svg+xml;base64," + btoa(svgXml);
    let image = new Image();
    image.onload = function () {
      
        let canvas: HTMLCanvasElement = document.createElement("canvas");
        let context: CanvasRenderingContext2D = canvas.getContext("2d");
        canvas.width = imageCanvas.width;
        canvas.height = imageCanvas.height;
        
        context.drawImage(imageCanvas, 0, 0);
        context.drawImage(image, 0, 0);

        var lnk = document.createElement('a'), e;

        /// the key here is to set the download attribute of the a tag
        lnk.download = 'afterglow_screenshot.jpg';

        /// convert canvas content to data-uri for link. When download
        /// attribute is set the content pointed to by link will be
        /// pushed as "download" in HTML5 capable browsers
        lnk.href = canvas.toDataURL("image/jpg;base64");

        /// create a "fake" click-event to trigger the download
        if (document.createEvent) {
          e = document.createEvent("MouseEvents");
          e.initMouseEvent("click", true, true, window,
                          0, 0, 0, 0, 0, false, false, false,
                          false, 0, null);

          lnk.dispatchEvent(e);
        }

        
    }
    image.src = data;
  }
}
