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

import { Observable, combineLatest } from "rxjs";
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
import { WorkbenchFileStates } from "../../workbench-file-states.state";
import { WorkbenchImageHduState } from "../../models/workbench-file-state";
import {
  LoadRawImageTile,
  ZoomTo,
  ZoomBy,
  MoveBy,
  UpdateNormalizedImageTile,
  CenterRegionInViewport
} from "../../../data-files/data-files.actions";
import { HduType } from "../../../data-files/models/data-file-type";
import {
  Transformation,
  Transform,
} from "../../../data-files/models/transformation";
import { IImageData } from "../../../data-files/models/image-data";
import { UpdateCurrentViewportSize } from "../../workbench.actions";

@Component({
  selector: "app-workbench-viewer",
  templateUrl: "./workbench-viewer.component.html",
  styleUrls: ["./workbench-viewer.component.scss"],
})
export class WorkbenchViewerComponent implements OnInit, OnChanges, OnDestroy {
  @Input()
  viewerId: string;

  @Input("data")
  set data(data: DataFile | IHdu) {
    this.data$.next(data);
  }
  get data() {
    return this.data$.getValue();
  }
  private data$ = new BehaviorSubject<DataFile | IHdu>(null);
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

  @ViewChild(PanZoomCanvasComponent, { static: true })
  panZoomCanvasComponent: PanZoomCanvasComponent;

  @ViewChild(ImageViewerMarkerOverlayComponent, { static: true })
  imageViewerMarkerOverlayComponent: ImageViewerMarkerOverlayComponent;

  viewportSize: { width: number; height: number };
  currentCanvasSize: { width: number; height: number } = null;
  // markers$: Observable<Marker[]>;
  imageDataId$: Observable<string>;
  imageData$: Observable<IImageData<Uint32Array>>;
  transformation$: Observable<Transformation>;
  imageToViewportTransformId$: Observable<string>;
  imageToViewportTransform$: Observable<Transform>;

  hduEntities$: Observable<{ [id: string]: IHdu }>;
  imageHdus$: Observable<ImageHdu[]>;
  tableHdus$: Observable<TableHdu[]>;
  displayMode$: Observable<HduType>;
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

    let viewerFileHdu$ = this.data$.pipe(
      distinctUntilChanged((a, b) => a.type == b.type && a.id == b.id),
      switchMap((item) => {
        if(item.type == 'hdu') {
          return this.store.select(DataFilesState.getHduById).pipe(
            map(fn => fn(item.id))
          )
        }
        else {
          return this.store.select(DataFilesState.getDataFileById).pipe(
            map(fn => fn(item.id))
          )
        }
      })
    )


    this.imageDataId$ = viewerFileHdu$.pipe(
      map((data) => {
        if(!data) return null;

        if(data.type == 'file') {
          return (data as DataFile).compositeImageDataId;
        }
        else if(data.type == 'hdu' && (data as IHdu).hduType == HduType.IMAGE) {
          return (data as ImageHdu).normalizedImageDataId;
        }
        return null;
      }),
      distinctUntilChanged()
    );

    this.imageData$ = this.imageDataId$.pipe(
      switchMap((imageDataId) => {
        return this.store
          .select(DataFilesState.getImageDataById)
          .pipe(map((fn) => fn(imageDataId) as IImageData<Uint32Array>));
      })
    );

    

    this.transformation$ = viewerFileHdu$.pipe(
      map((data) => {
        if(!data) return null;

        if(data.type == 'file') {
          return (data as DataFile).transformation;
        }
        else if(data.type == 'hdu' && (data as IHdu).hduType == HduType.IMAGE) {
          return (data as ImageHdu).transformation;
        }
        return null;
      }),
      distinctUntilChanged()
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

    this.hduEntities$ = this.store.select(DataFilesState.getHduEntities);

    

    this.imageHdus$ = this.data$.pipe(
      distinctUntilChanged((a, b) => a.type == b.type && a.id == b.id),
      map((item) => {
        let dataFileEntities = this.store.selectSnapshot(
          DataFilesState.getDataFileEntities
        );
        let hduEntities = this.store.selectSnapshot(
          DataFilesState.getHduEntities
        );
        let hdus =
          item.type == "hdu"
            ? [hduEntities[item.id]]
            : dataFileEntities[item.id].hduIds.map((id) => hduEntities[id]);
        return hdus.filter((hdu) => hdu.hduType == HduType.IMAGE) as ImageHdu[];
      })
    );
    this.tableHdus$ = this.data$.pipe(
      distinctUntilChanged((a, b) => a.type == b.type && a.id == b.id),
      map((item) => {
        let dataFileEntities = this.store.selectSnapshot(
          DataFilesState.getDataFileEntities
        );
        let hduEntities = this.store.selectSnapshot(
          DataFilesState.getHduEntities
        );
        let hdus =
          item.type == "hdu"
            ? [hduEntities[item.id]]
            : dataFileEntities[item.id].hduIds.map((id) => hduEntities[id]);
        return hdus.filter((hdu) => hdu.hduType == HduType.TABLE) as TableHdu[];
      })
    );

    this.displayMode$ = combineLatest(this.imageHdus$, this.tableHdus$).pipe(
      map(([imageHdus, tableHdus]) => {
        if (imageHdus.length != 0) {
          return HduType.IMAGE;
        } else if (tableHdus.length != 0) {
          return HduType.TABLE;
        }
        return null;
      })
    );

    this.sources$ = this.store.select(SourcesState.getSources);
  }

  ngOnInit() {}

  ngOnDestroy() {}

  ngOnChanges(changes: { [key: string]: SimpleChange }) {}

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
    $event: MoveByEvent,
    imageData: IImageData<Uint32Array>,
    transformation: Transformation
  ) {
    if (!this.viewportSize) return;
    this.store.dispatch(
      new MoveBy(
        transformation,
        imageData.id,
        this.viewportSize,
        $event.xShift,
        $event.yShift
      )
    );
  }

  handleZoomBy(
    $event: ZoomByEvent,
    imageData: IImageData<Uint32Array>,
    transformation: Transformation
  ) {
    if (!this.viewportSize) return;
    this.store.dispatch(
      new ZoomBy(
        transformation,
        imageData.id,
        this.viewportSize,
        $event.factor,
        $event.anchor
      )
    );
  }

  handleZoomTo(
    $event: ZoomByEvent,
    imageData: IImageData<Uint32Array>,
    transformation: Transformation
  ) {
    this.store.dispatch(
      new ZoomTo(
        transformation,
        imageData.id,
        this.viewportSize,
        $event.factor,
        $event.anchor
      )
    );
  }

  handleZoomToFit(
    $event: ZoomToFitEvent,
    imageData: IImageData<Uint32Array>,
    transformation: Transformation
  ) {
    this.store.dispatch(new CenterRegionInViewport(
      transformation,
      imageData.id,
      this.viewportSize,
      { x: 1, y: 1, width: imageData.width, height: imageData.height }
    ))
  }

  handleViewportSizeChange($event: ViewportSizeChangeEvent) {
    this.viewportSize = $event;
    this.store.dispatch(new UpdateCurrentViewportSize(this.viewerId, $event));
  }

  handleCanvasSizeChange($event: CanvasSizeChangeEvent) {
    this.currentCanvasSize = { width: $event.width, height: $event.height };
  }

  handleLoadTile($event: LoadTileEvent) {
    // should only need to load the raw data
    // the normalized and composite data will be updated automatically
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let dataFileEntities = this.store.selectSnapshot(DataFilesState.getDataFileEntities);
    let hdus: ImageHdu[] = [];
    if(this.data.type == 'hdu') {
      hdus = [hduEntities[this.data.id] as ImageHdu]
    }
    else if(this.data.type == 'file') {
      let file = dataFileEntities[this.data.id];
      hdus = file.hduIds.map(hduId => hduEntities[hduId]).filter(hdu => hdu.hduType == HduType.IMAGE) as ImageHdu[];
    }
    
    
    hdus.forEach(hdu => {

      let rawImageData = this.store.selectSnapshot(
        DataFilesState.getImageDataEntities
      )[hdu.rawImageDataId];
      if (!rawImageData.initialized) return;
      let rawTile = rawImageData.tiles[$event.tileIndex];
      if (
        !rawTile.pixelsLoaded &&
        !rawTile.pixelsLoading &&
        !rawTile.pixelLoadingFailed
      ) {
        this.store.dispatch(new LoadRawImageTile(hdu.id, rawTile.index));
      }
      // else if (rawTile.pixelsLoaded) {
      //   let normalizedImageData = this.store.selectSnapshot(
      //     DataFilesState.getImageDataEntities
      //   )[hdu.normalizedImageDataId];
      //   if (!normalizedImageData.initialized) return;
      //   let normalizedTile = normalizedImageData.tiles[rawTile.index];
      //   if (
      //     normalizedTile &&
      //     !normalizedTile.pixelsLoaded &&
      //     !normalizedTile.pixelsLoading &&
      //     !normalizedTile.pixelLoadingFailed
      //   ) {
      //     this.store.dispatch(
      //       new UpdateNormalizedImageTile(hdu.id, normalizedTile.index)
      //     );
      //   }
      // }
    })
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
