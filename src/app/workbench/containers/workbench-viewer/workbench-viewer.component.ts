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
  getCenterTime,
  IHdu,
  ImageHdu
} from "../../../data-files/models/data-file";
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
  MoveByEvent,
  ZoomByEvent,
  ViewportSizeChangeEvent,
  LoadTileEvent,
  PanZoomCanvasLayer,
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
import { IWorkbenchHduState, WorkbenchImageHduState } from '../../models/workbench-file-state';
import { MoveBy, ZoomBy, UpdateCurrentViewportSize, NormalizeImageTile } from '../../workbench-file-states.actions';
import { LoadImageTilePixels } from '../../../data-files/data-files.actions';
import { HduType } from '../../../data-files/models/data-file-type';
import { of } from 'core-js/fn/array';


@Component({
  selector: "app-workbench-viewer",
  templateUrl: "./workbench-viewer.component.html",
  styleUrls: ["./workbench-viewer.component.scss"]
})
export class WorkbenchViewerComponent implements OnInit, OnChanges, OnDestroy {
  @Input("data")
  set data(data: DataFile | IHdu) {
    this.data$.next(data);
  }
  get data() {
    return this.data$.getValue();
  }
  private data$ = new BehaviorSubject< DataFile | IHdu>(null);
  
  
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

  @ViewChild(ImageViewerMarkerOverlayComponent)
  imageViewerMarkerOverlayComponent: ImageViewerMarkerOverlayComponent;

  

  // markers$: Observable<Marker[]>;
  hdus$: Observable<{[id: string]: IHdu}>;
  imageHdus$: Observable<ImageHdu[]>;
  layers$: Observable<PanZoomCanvasLayer[]>;
  sourceMarkersLayer$: Observable<Marker[]>;
  sourceExtractorRegionMarkerLayer$: Observable<Marker[]>;
  
  transformation$: Observable<Transformation>;
  sources$: Observable<Source[]>;
  customMarkers$: Observable<CustomMarker[]>;
  selectedCustomMarkers$: Observable<CustomMarker[]>;
  showAllSources$: Observable<boolean>;
  imageMouseX: number = null;
  imageMouseY: number = null;

  fieldCals$: Observable<FieldCal[]>;
  selectedFieldCal$: Observable<FieldCal>;
  selectedFieldCalId$: Observable<string>;
  fieldCalMarkers$: Observable<Marker[]>;

  constructor(private store: Store, private sanitization: DomSanitizer) {
    this.hdus$ = this.store.select(DataFilesState.getHduEntities);
    this.imageHdus$ = this.data$.pipe(
      distinctUntilChanged((a,b) => a.type == b.type && a.id == b.id),
      map(item => {
        let dataFileEntities = this.store.selectSnapshot(DataFilesState.getDataFileEntities);
        let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
        let hdus = (item.type == 'hdu') ? [hduEntities[item.id]] : dataFileEntities[item.id].hduIds.map(id => hduEntities[id]);
        return hdus.filter(hdu => hdu.hduType == HduType.IMAGE) as ImageHdu[];
      })
    )


    this.layers$ = this.imageHdus$.pipe(
      switchMap(imageHdus => {
        return combineLatest(
          ...imageHdus.map(hdu => {
             return this.store.select(WorkbenchFileStates.getNormalization).pipe(
               map(fn => fn(hdu.id)),
               distinctUntilChanged(),
               map(normalization => {
                 return {  
                  id: hdu.id,
                  alpha: 1.0,
                  blendMode: BlendMode.Normal,
                  data: normalization
                } as PanZoomCanvasLayer
               })
             )
          })
        )
      })
    )

    this.sources$ = this.store.select(SourcesState.getSources);

    
    this.transformation$ = this.data$.pipe(
      switchMap(data => {
        let hduId = data.id;
        if(data.type == 'file') {
          hduId = (data as DataFile).hduIds[0];
        }
        return this.store.select(WorkbenchFileStates.getTransformation).pipe(
          map(fn => fn(hduId))
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

  handleMoveBy($event: MoveByEvent) {
    let hduId = this.data.id;
    if(this.data.type == 'file') {
      hduId = (this.data as DataFile).hduIds[0];
    }
    
    this.store.dispatch(new MoveBy(
      hduId,
      $event.xShift,
      $event.yShift
    ));
  }

  handleZoomBy($event: ZoomByEvent) {
    let hduId = this.data.id;
    if(this.data.type == 'file') {
      hduId = (this.data as DataFile).hduIds[0];
    }

    this.store.dispatch(new ZoomBy(
      hduId,
      $event.factor,
      $event.anchor
    ));
  }

  handleViewportSizeChange($event: ViewportSizeChangeEvent) {
    let hduIds = [this.data.id];
    if(this.data.type == 'file') {
      hduIds = (this.data as DataFile).hduIds;
    }

    hduIds.forEach(hduId => {
      this.store.dispatch(new UpdateCurrentViewportSize(
        hduId,
        $event
      )); 
    })
  }

  handleLoadTile($event: LoadTileEvent) {
    let hduId = $event.layer.id;
    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[hduId] as ImageHdu;
    if(!hdu.tilesInitialized) return;
    let rawTile = hdu.tiles[$event.tileIndex]
    if (!rawTile.pixelsLoaded && !rawTile.pixelsLoading && !rawTile.pixelLoadingFailed) {
      this.store.dispatch(new LoadImageTilePixels(
        hduId,
        rawTile.index
      ));
    }
    else if(rawTile.pixelsLoaded) {
      let normalization = (this.store.selectSnapshot(WorkbenchFileStates.getHduStateEntities)[hduId] as WorkbenchImageHduState).normalization;
      if(!normalization.initialized || !normalization.tilesInitialized) {
        
        return;
      }
      let normalizedTile = normalization.tiles[rawTile.index];
      if (normalizedTile && !normalizedTile.pixelsLoaded && !normalizedTile.pixelsLoading && !normalizedTile.pixelLoadingFailed) {
      this.store.dispatch(new NormalizeImageTile(
        hduId,
        normalizedTile.index
      ));
      }
    }
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
          0, false, false, false,
          false, null);

        lnk.dispatchEvent(e);
      }


    }
    image.src = data;
  }
}
