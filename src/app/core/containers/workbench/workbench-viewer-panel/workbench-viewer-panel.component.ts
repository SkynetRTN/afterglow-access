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
import { distinctUntilChanged, map, flatMap, filter, withLatestFrom, tap } from "rxjs/operators";
import { Dictionary } from "@ngrx/entity/src/models";
import {
  DataFile,
  ImageFile,
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
import { Store } from '@ngxs/store';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { SourcesState } from '../../../sources.state';
import { CustomMarkersState } from '../../../custom-markers.state';
import { WorkbenchState } from '../../../workbench.state';
import { ImageFilesState } from '../../../image-files.state';

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

  @ViewChild(PanZoomCanvasComponent, { static: true })
  panZoomCanvasComponent: PanZoomCanvasComponent;

  @ViewChild(ImageViewerMarkerOverlayComponent, { static: false })
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
  imageFileState$: Observable<ImageFileState>;
  imageMouseX: number = null;
  imageMouseY: number = null;

  fieldCals$: Observable<FieldCal[]>;
  selectedFieldCal$: Observable<FieldCal>;
  selectedFieldCalId$: Observable<string>;
  fieldCalMarkers$: Observable<Marker[]>;

  constructor(private store: Store, private sanitization: DomSanitizer) {
    this.files$ = this.store.select(DataFilesState.getEntities);
    this.sources$ = this.store.select(SourcesState.getSources);
    this.customMarkers$ = this.store.select(CustomMarkersState.getCustomMarkers);
    this.selectedCustomMarkers$ = this.store.select(CustomMarkersState.getSelectedCustomMarkers);
    this.selectedSources$ = this.store.select(SourcesState.getSelectedSources);
    this.showAllSources$ = this.store
      .select(WorkbenchState.getShowAllSources)
      .pipe(distinctUntilChanged());

    this.imageFileState$ = combineLatest(
      this.fileId$,
      this.store.select(ImageFilesState.getEntities)
    ).pipe(
      map(([fileId, imageFileStates]) => imageFileStates[fileId]),
    );

    let plotterMarkers$ = this.fileId$.pipe(
      flatMap(fileId => {
        return this.store
          .select(WorkbenchState.getPlotterMarkers)
          .pipe(map(fn => fn(fileId)));
      })
    )

    let sonifierMarkers$ = this.fileId$.pipe(
      flatMap(fileId => {
        return this.store
          .select(WorkbenchState.getSonifierMarkers)
          .pipe(map(fn => fn(fileId)));
      })
    )

    let sourceMarkers$ = this.fileId$.pipe(
      flatMap(fileId => {
        return this.store
          .select(WorkbenchState.getSourceMarkers)
          .pipe(map(fn => fn(fileId)));
      })
    )

    let customMarkers$ = this.fileId$.pipe(
      flatMap(fileId => {
        return this.store
          .select(WorkbenchState.getCustomMarkers)
          .pipe(map(fn => fn(fileId)));
      })
    )

    // this.fieldCals$ = store.select(WorkbenchState.getState).pipe(map(state => state.fieldCals));
    // this.selectedFieldCalId$ = store.select(WorkbenchState.getState).pipe(map(state => state.selectedFieldCalId));
    // this.selectedFieldCal$ = combineLatest(this.fieldCals$, this.selectedFieldCalId$).pipe(
    //   map(([fieldCals, selectedFieldCalId]) => {
    //     if (!fieldCals || selectedFieldCalId == null) return null;
    //     let selectedFieldCal = fieldCals.find(fieldCal => fieldCal.id == selectedFieldCalId);
    //     if (!selectedFieldCal) return null;
    //     return selectedFieldCal;
    //   })
    // );


    // let fieldCalMarkers$ = combineLatest(
    //   this.fileId$,
    //   this.files$,
    //   this.selectedFieldCal$
    // ).pipe(
    //   map(([fileId, files, fieldCal]) => {
    //     if (fileId === null || fieldCal == null) return [[]];
    //     let markers: Array<CircleMarker> = [];
    //     let file = files[fileId] as ImageFile;
    //     if (!file || !file.headerLoaded || !file.wcs.isValid()) return [[]];


    //     fieldCal.catalogSources.forEach(source => {
    //       let primaryCoord = source.primaryCoord;
    //       let secondaryCoord = source.secondaryCoord;
    //       // let selected = selectedSources.includes(source);
    //       let selected = false;

    //       let wcs = file.wcs;
    //       let xy = wcs.worldToPix([primaryCoord, secondaryCoord]);
    //       let x = xy[0];
    //       let y = xy[1];
    //       if (
    //         x < 0.5 ||
    //         x >= getWidth(file) + 0.5 ||
    //         y < 0.5 ||
    //         y >= getHeight(file) + 0.5
    //       ) return;

    //       markers.push({
    //         type: MarkerType.CIRCLE,
    //         x: x,
    //         y: y,
    //         radius: 15,
    //         labelGap: 14,
    //         labelTheta: 0,
    //         selected: selected,
    //         data: { id: source.id }
    //       } as CircleMarker);


    //     });

    //     return markers;
    //   })
    // );

   
    this.markers$ = combineLatest(
      this.store.select(WorkbenchState.getActiveTool),
      plotterMarkers$,
      sonifierMarkers$,
      sourceMarkers$,
      customMarkers$,
      // fieldCalMarkers$
    ).pipe(
      map(
        ([
          activeTool,
          plotterMarkers,
          sonifierMarkers,
          sourceMarkers,
          customMarkers,
          // fieldCalMarkers
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
          // if (activeTool == WorkbenchTool.FIELD_CAL) {
          //   markers.push(...fieldCalMarkers);
          // }
          return markers;
        }
      )
    );
  }

  ngOnInit() { }

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
