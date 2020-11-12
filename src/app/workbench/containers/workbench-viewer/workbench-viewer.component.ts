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
  OnDestroy,
} from "@angular/core";

import { DomSanitizer, SafeValue } from "@angular/platform-browser";

import { Observable, combineLatest, of } from "rxjs";
import {
  distinctUntilChanged,
  map,
  flatMap,
  filter,
  withLatestFrom,
  tap,
  switchMap,
} from "rxjs/operators";
import {
  DataFile,
  getWidth,
  getHeight,
  getDegsPerPixel,
  getCenterTime,
  IHdu,
  ImageHdu,
  TableHdu,
  PixelType,
} from "../../../data-files/models/data-file";
import {
  Marker,
  LineMarker,
  MarkerType,
  TeardropMarker,
  CircleMarker,
  RectangleMarker,
} from "../../models/marker";
import { BehaviorSubject, Subject } from "rxjs";
import {
  CanvasMouseEvent,
  PanZoomCanvasComponent,
  MoveByEvent,
  ZoomByEvent,
  ViewportSizeChangeEvent,
  LoadTileEvent,
  CanvasSizeChangeEvent,
  ZoomToFitEvent,
} from "../../components/pan-zoom-canvas/pan-zoom-canvas.component";
import {
  MarkerMouseEvent,
  ImageViewerMarkerOverlayComponent,
} from "../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component";
import { Source, PosType } from "../../models/source";
import { CustomMarker } from "../../models/custom-marker";
import { FieldCal } from "../../models/field-cal";
import { Store } from "@ngxs/store";
import { DataFilesState } from "../../../data-files/data-files.state";
import { SourcesState } from "../../sources.state";
import {
  LoadRawImageTile,
  ZoomTo,
  ZoomBy,
  MoveBy,
  UpdateNormalizedImageTile,
  CenterRegionInViewport,
  UpdateCompositeImageTile
} from "../../../data-files/data-files.actions";
import { HduType } from "../../../data-files/models/data-file-type";
import {
  Transformation,
  Transform,
} from "../../../data-files/models/transformation";
import { IImageData } from "../../../data-files/models/image-data";
import { UpdateCurrentViewportSize } from "../../workbench.actions";
import { raw } from 'core-js/fn/string';

@Component({
  selector: "app-workbench-viewer",
  templateUrl: "./workbench-viewer.component.html",
  styleUrls: ["./workbench-viewer.component.scss"],
})
export class WorkbenchViewerComponent implements OnInit, OnChanges, OnDestroy {
  @Input()
  viewerId: string;

  @Input("fileId")
  set fileId(fileId: string) {
    this.fileId$.next(fileId);
  }
  get fileId() {
    return this.fileId$.getValue();
  }
  private fileId$ = new BehaviorSubject<string>(null);


  @Input("hduId")
  set hduId(hduId: string) {
    this.hduId$.next(hduId);
  }
  get hduId() {
    return this.hduId$.getValue();
  }
  private hduId$ = new BehaviorSubject<string>(null);

  HduType = HduType;

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

  @ViewChild(PanZoomCanvasComponent, { static: false })
  panZoomCanvasComponent: PanZoomCanvasComponent;

  @ViewChild(ImageViewerMarkerOverlayComponent, { static: false })
  imageViewerMarkerOverlayComponent: ImageViewerMarkerOverlayComponent;

  hduEntities$: Observable<{ [id: string]: IHdu }>;
  viewportSize: { width: number; height: number };
  currentCanvasSize: { width: number; height: number } = null;
  // markers$: Observable<Marker[]>;
  tableData: any = null;
  rawImageDataId$: Observable<string>;
  rawImageData$: Observable<IImageData<PixelType>>;
  normalizedImageDataId$: Observable<string>;
  normalizedImageData$: Observable<IImageData<Uint32Array>>;
  normalizedImageData: IImageData<Uint32Array>;
  transformation$: Observable<Transformation>;
  transformation: Transformation;
  imageToViewportTransformId$: Observable<string>;
  imageToViewportTransform$: Observable<Transform>;

  sourceMarkersLayer$: Observable<Marker[]>;
  sourceExtractorRegionMarkerLayer$: Observable<Marker[]>;
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
    this.hduEntities$ = this.store.select(DataFilesState.getHduEntities);

    let imageHdusLoaded$ = combineLatest(
      this.fileId$,
      this.hduId$
    ).pipe(
      switchMap(([fileId, hduId]) => {
        let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
        let fileEntities = this.store.selectSnapshot(DataFilesState.getDataFileEntities);
        let allHduIds = hduId ? [hduId] : fileEntities[fileId].hduIds;
        let hdus = allHduIds.map(hduId => hduEntities[hduId]).filter(hdu => {
          if (!hdu) return false;
          if (hdu.hduType != HduType.IMAGE) return false;
          return true;
        }) as ImageHdu[];

        if (hdus.length == 0) return of(false);
        return combineLatest(...hdus.map(hdu => this.store.select(DataFilesState.getHduById).pipe(
          map(fn => fn(hdu.id).header.loaded && (fn(hdu.id) as ImageHdu).histLoaded)
        ))).pipe(map(hdusReady => {
          return !hdusReady.includes(false)
        }))
      }),
      distinctUntilChanged()
    );

    this.rawImageDataId$ = combineLatest(
      imageHdusLoaded$,
      this.fileId$,
      this.hduId$
    ).pipe(
      switchMap(([loaded, fileId, hduId]) => {
        if (!loaded || !hduId) return of(null);
        let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
        if (hduId in hduEntities && hduEntities[hduId].hduType == HduType.IMAGE) {
          return this.store.select(DataFilesState.getHduById).pipe(
            map(fn => (fn(hduId) as ImageHdu).rawImageDataId)
          );
        }
        return of(null);
      }),
      distinctUntilChanged()
    );

    this.rawImageData$ = this.rawImageDataId$.pipe(
      switchMap((imageDataId) => {
        if (!imageDataId) return of(null);
        return this.store
          .select(DataFilesState.getImageDataById)
          .pipe(
            map((fn) => fn(imageDataId) as IImageData<PixelType>),
          );
      })
    );


    this.normalizedImageDataId$ = combineLatest(
      imageHdusLoaded$,
      this.fileId$,
      this.hduId$
    ).pipe(
      switchMap(([loaded, fileId, hduId]) => {
        if (!loaded) return of(null);

        let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
        let fileEntities = this.store.selectSnapshot(DataFilesState.getDataFileEntities);
        if (hduId) {
          if (hduId in hduEntities && hduEntities[hduId].hduType == HduType.IMAGE) {
            return this.store.select(DataFilesState.getHduById).pipe(
              map(fn => (fn(hduId) as ImageHdu).normalizedImageDataId)
            );
          }

        }
        else if (fileId && fileId in fileEntities) {
          return this.store.select(DataFilesState.getDataFileById).pipe(
            map(fn => fn(fileId).compositeImageDataId)
          );
        }
        return of(null);
      }),
      distinctUntilChanged()
    );

    this.normalizedImageData$ = this.normalizedImageDataId$.pipe(
      switchMap((imageDataId) => {
        if (!imageDataId) return of(null);
        return this.store
          .select(DataFilesState.getImageDataById)
          .pipe(
            map((fn) => fn(imageDataId) as IImageData<Uint32Array>),
          );
      }),
      tap(v => {
        this.normalizedImageData = v
      })
    );

    this.transformation$ = combineLatest(
      this.fileId$,
      this.hduId$
    ).pipe(
      switchMap(([fileId, hduId]) => {
        let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
        let fileEntities = this.store.selectSnapshot(DataFilesState.getDataFileEntities);
        if (hduId) {
          if (hduId in hduEntities && hduEntities[hduId].hduType == HduType.IMAGE) {
            return this.store.select(DataFilesState.getHduById).pipe(
              map(fn => (fn(hduId) as ImageHdu).transformation)
            );
          }

        }
        else if (fileId && fileId in fileEntities) {
          return this.store.select(DataFilesState.getDataFileById).pipe(
            map(fn => fn(fileId).transformation)
          );
        }
        return of(null);
      }),
      distinctUntilChanged(),
      tap(v => this.transformation = v)
    );


    this.imageToViewportTransformId$ = this.transformation$.pipe(
      map((transformation) => transformation && transformation.imageToViewportTransformId),
      distinctUntilChanged()
    );

    this.imageToViewportTransform$ = this.imageToViewportTransformId$.pipe(
      switchMap((transformId) => {
        return this.store
          .select(DataFilesState.getTransformById)
          .pipe(map((fn) => fn(transformId)));
      })
    );

    this.sources$ = this.store.select(SourcesState.getSources);
  }

  ngOnInit() { }

  ngOnDestroy() { }

  ngOnChanges(changes: { [key: string]: SimpleChange }) { }

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

  handleMoveBy(
    $event: MoveByEvent
  ) {
    if (!this.viewportSize || !this.normalizedImageData || !this.transformation) return;
    this.store.dispatch(
      new MoveBy(
        this.transformation,
        this.normalizedImageData.id,
        this.viewportSize,
        $event.xShift,
        $event.yShift
      )
    );
  }

  handleZoomBy(
    $event: ZoomByEvent
  ) {
    if (!this.viewportSize || !this.normalizedImageData || !this.transformation) return;
    this.store.dispatch(
      new ZoomBy(
        this.transformation,
        this.normalizedImageData.id,
        this.viewportSize,
        $event.factor,
        $event.anchor
      )
    );
  }

  handleZoomTo(
    $event: ZoomByEvent
  ) {
    if (!this.viewportSize || !this.normalizedImageData || !this.transformation) return;
    this.store.dispatch(
      new ZoomTo(
        this.transformation,
        this.normalizedImageData.id,
        this.viewportSize,
        $event.factor,
        $event.anchor
      )
    );
  }

  handleZoomToFit(
    $event: ZoomToFitEvent
  ) {
    if (!this.viewportSize || !this.normalizedImageData || !this.transformation) return;
    this.store.dispatch(new CenterRegionInViewport(
      this.transformation,
      this.normalizedImageData.id,
      this.viewportSize,
      { x: 1, y: 1, width: this.normalizedImageData.width, height: this.normalizedImageData.height }
    ))
  }

  handleViewportSizeChange($event: ViewportSizeChangeEvent) {
    this.viewportSize = $event;
    this.store.dispatch(new UpdateCurrentViewportSize(this.viewerId, $event));
  }

  handleCanvasSizeChange($event: CanvasSizeChangeEvent) {
    console.log("UPDATING CANVASE SIZE CHANGE EVENT")
    this.currentCanvasSize = { width: $event.width, height: $event.height };
  }

  handleLoadTile($event: LoadTileEvent) {
    // should only need to load the raw data
    // the normalized and composite data will be updated automatically
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let dataFileEntities = this.store.selectSnapshot(DataFilesState.getDataFileEntities);
    let imageDataEntities = this.store.selectSnapshot(DataFilesState.getImageDataEntities);

    if (this.hduId) {
      let hdu = hduEntities[this.hduId];
      if (!hdu || hdu.hduType != HduType.IMAGE) return;
      let normalizedImageData = imageDataEntities[(hdu as ImageHdu).normalizedImageDataId];
      if (!normalizedImageData || !normalizedImageData.initialized) return;
      let rawImageData = imageDataEntities[(hdu as ImageHdu).rawImageDataId];
      if (!rawImageData || !rawImageData.initialized) return;
      let rawTile = rawImageData.tiles[$event.tileIndex];
      let tile = normalizedImageData.tiles[$event.tileIndex];
      if ((!rawTile.pixelsLoading && !rawTile.pixelLoadingFailed) && (!tile.isValid || !tile.pixelsLoaded)) {
        this.store.dispatch(new UpdateNormalizedImageTile(hdu.id, tile.index))
      }
    }
    else if (this.fileId) {
      let file = dataFileEntities[this.fileId];
      if (!file) return;
      let compositeImageData = imageDataEntities[file.compositeImageDataId];
      if (!compositeImageData || !compositeImageData.initialized) return;
      let tile = compositeImageData.tiles[$event.tileIndex];
      if ((!tile.pixelsLoading && !tile.pixelLoadingFailed) && (!tile.isValid || !tile.pixelsLoaded)) {
        this.store.dispatch(new UpdateCompositeImageTile(file.id, tile.index))
      }
    }
  }

  handleDownloadSnapshot() {
    let imageCanvas = this.panZoomCanvasComponent.canvas;

    // http://svgopen.org/2010/papers/62-From_SVG_to_Canvas_and_Back/
    let markerSvg = this.imageViewerMarkerOverlayComponent.svg;
    let svgXml = new XMLSerializer().serializeToString(markerSvg);
    let data = "data:image/svg+xml;base64," + btoa(svgXml);
    
    
    let image = new Image();
    image.onload = function () {
      let canvas: HTMLCanvasElement = document.createElement("canvas");
      let context: CanvasRenderingContext2D = canvas.getContext("2d");
      canvas.width = imageCanvas.width;
      canvas.height = imageCanvas.height;

      context.drawImage(imageCanvas, 0, 0);
      context.drawImage(image, 0, 0);

      var lnk = document.createElement("a"),
        e;

      /// the key here is to set the download attribute of the a tag
      lnk.download = "afterglow_screenshot.jpg";

      /// convert canvas content to data-uri for link. When download
      /// attribute is set the content pointed to by link will be
      /// pushed as "download" in HTML5 capable browsers
      lnk.href = canvas.toDataURL("image/jpg;base64");

      /// create a "fake" click-event to trigger the download
      if (document.createEvent) {
        e = document.createEvent("MouseEvents");
        e.initMouseEvent(
          "click",
          true,
          true,
          window,
          0,
          false,
          false,
          false,
          false,
          null
        );

        lnk.dispatchEvent(e);
      }
    };
    image.src = data;
  }
}
