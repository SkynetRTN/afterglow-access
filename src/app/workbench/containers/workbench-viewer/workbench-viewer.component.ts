import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  SimpleChange,
  OnChanges,
  ViewChild,
  ElementRef,
  OnDestroy
} from "@angular/core";

import {
  DomSanitizer, SafeValue
} from '@angular/platform-browser';

import { Observable, combineLatest } from "rxjs";
import { distinctUntilChanged, map, flatMap, filter, withLatestFrom, tap, switchMap } from "rxjs/operators";
import {
  DataFile,
  getWidth,
  getHeight,
  getDegsPerPixel,
  getCenterTime
} from "../../../data-files/models/data-file";
import { WorkbenchDataFileState } from "../../models/workbench-file-state";
import {
  Marker,
  LineMarker,
  MarkerType,
  TeardropMarker,
  CircleMarker,
  RectangleMarker
} from "../../models/marker";
import { BehaviorSubject, Subject } from "rxjs";
import {
  CanvasMouseEvent,
  PanZoomCanvasComponent,
  PanZoomCanvasLayer
} from "../../components/pan-zoom-canvas/pan-zoom-canvas.component";
import {
  MarkerMouseEvent,
  ImageViewerMarkerOverlayComponent
} from "../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component";
import { Source, PosType } from "../../models/source";
import { CustomMarker } from "../../models/custom-marker";
import { FieldCal } from '../../models/field-cal';
import { Store } from '@ngxs/store';
import { DataFilesState } from '../../../data-files/data-files.state';
import { SourcesState } from '../../sources.state';
import { WorkbenchFileStates } from '../../workbench-file-states.state';
import { Viewer } from '../../models/viewer';
import { BlendMode } from '../../models/blend-mode';
import { Transformation } from '../../models/transformation';


@Component({
  selector: "app-workbench-viewer",
  templateUrl: "./workbench-viewer.component.html",
  styleUrls: ["./workbench-viewer.component.scss"]
})
export class WorkbenchViewerComponent implements OnInit, OnChanges, OnDestroy {
  @Input("fileId")
  set fileId(fileId: string) {
    this.fileId$.next(fileId);
  }
  get fileId() {
    return this.fileId$.getValue();
  }
  private fileId$ = new BehaviorSubject<string>(null);
  
  
  @Input()
  showInfoBar: boolean = true;
  @Input()
  active: boolean = true;
  @Input()
  markers: Marker[] = [];

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

  // markers$: Observable<Marker[]>;
  
  sourceMarkersLayer$: Observable<Marker[]>;
  sourceExtractorRegionMarkerLayer$: Observable<Marker[]>;
  files$: Observable<{[id: string]: DataFile}>;
  layers$: Observable<PanZoomCanvasLayer[]>
  transformation$: Observable<Transformation>;
  sources$: Observable<Source[]>;
  customMarkers$: Observable<CustomMarker[]>;
  selectedCustomMarkers$: Observable<CustomMarker[]>;
  showAllSources$: Observable<boolean>;
  imageFileState$: Observable<WorkbenchDataFileState>;
  imageMouseX: number = null;
  imageMouseY: number = null;

  fieldCals$: Observable<FieldCal[]>;
  selectedFieldCal$: Observable<FieldCal>;
  selectedFieldCalId$: Observable<string>;
  fieldCalMarkers$: Observable<Marker[]>;

  constructor(private store: Store, private sanitization: DomSanitizer) {
    this.files$ = this.store.select(DataFilesState.getEntities);

    this.sources$ = this.store.select(SourcesState.getSources);
    // this.customMarkers$ = this.store.select(CustomMarkersState.getCustomMarkers);
    // this.selectedCustomMarkers$ = this.store.select(CustomMarkersState.getSelectedCustomMarkers);
    this.imageFileState$ = combineLatest(
      this.fileId$,
      this.store.select(WorkbenchFileStates.getEntities)
    ).pipe(
      map(([fileId, imageFileStates]) => imageFileStates[fileId]),
    );

    this.layers$ = this.fileId$.pipe(
      switchMap(fileId => {
        return this.store.select(WorkbenchFileStates.getNormalization).pipe(
          map(fn => {
            return [{
              alpha: 1.0,
              blendMode: BlendMode.Normal,
              ...fn(fileId, 0)
            }] 
          })
        )
      })
    )

    this.transformation$ = this.fileId$.pipe(
      switchMap(fileId => {
        return this.store.select(WorkbenchFileStates.getTransformation).pipe(
          map(fn => fn(fileId, 0))
        )
      })
    )
  }

  

  ngOnInit() { }

  ngOnDestroy() {
    
  }

  ngOnChanges(changes: { [key: string]: SimpleChange }) {
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
