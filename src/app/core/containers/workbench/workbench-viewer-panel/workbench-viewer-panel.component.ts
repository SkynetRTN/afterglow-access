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
import { distinctUntilChanged, map, flatMap, filter, withLatestFrom, tap } from "rxjs/operators";
import {
  DataFile,
  ImageFile,
  getWidth,
  getHeight,
  getDegsPerPixel,
  getCenterTime
} from "../../../../data-files/models/data-file";
import { WorkbenchFileState } from "../../../models/workbench-file-state";
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
import { PlottingState } from "../../../models/plotter-file-state";
import { min } from "../../../../../../node_modules/rxjs/operators";
import { CustomMarker } from "../../../models/custom-marker";
import { FieldCal } from '../../../models/field-cal';
import { Store } from '@ngxs/store';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { SourcesState } from '../../../sources.state';
import { WorkbenchState } from '../../../workbench.state';
import { WorkbenchFileStates } from '../../../workbench-file-states.state';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';

@Component({
  selector: "app-workbench-viewer-panel",
  templateUrl: "./workbench-viewer-panel.component.html",
  styleUrls: ["./workbench-viewer-panel.component.scss"]
})
export class WorkbenchViewerPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input()
  fileId: string;
  private fileId$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
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
  sources$: Observable<Source[]>;
  customMarkers$: Observable<CustomMarker[]>;
  selectedCustomMarkers$: Observable<CustomMarker[]>;
  showAllSources$: Observable<boolean>;
  imageFileState$: Observable<WorkbenchFileState>;
  imageMouseX: number = null;
  imageMouseY: number = null;

  fieldCals$: Observable<FieldCal[]>;
  selectedFieldCal$: Observable<FieldCal>;
  selectedFieldCalId$: Observable<string>;
  fieldCalMarkers$: Observable<Marker[]>;

  constructor(private store: Store, private sanitization: DomSanitizer) {
    this.files$ = this.store.select(DataFilesState.getEntities);
    let fileReady$ = combineLatest(this.fileId$, this.files$).pipe(
      filter(([fileId, files]) => fileId in files && files[fileId].headerLoaded)
    );

    this.sources$ = this.store.select(SourcesState.getSources);
    // this.customMarkers$ = this.store.select(CustomMarkersState.getCustomMarkers);
    // this.selectedCustomMarkers$ = this.store.select(CustomMarkersState.getSelectedCustomMarkers);
    this.imageFileState$ = combineLatest(
      this.fileId$,
      this.store.select(WorkbenchFileStates.getEntities)
    ).pipe(
      map(([fileId, imageFileStates]) => imageFileStates[fileId]),
    );

    


    

  }

  

  ngOnInit() { }

  ngOnDestroy() {
    
  }

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
