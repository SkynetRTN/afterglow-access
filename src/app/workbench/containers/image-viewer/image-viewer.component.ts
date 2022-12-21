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
  ChangeDetectionStrategy,
} from '@angular/core';

import { DomSanitizer, SafeValue } from '@angular/platform-browser';

import { Observable, combineLatest, of, forkJoin } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  flatMap,
  filter,
  withLatestFrom,
  tap,
  switchMap,
  takeUntil,
  first,
  take,
} from 'rxjs/operators';
import {
  DataFile,
  getWidth,
  getHeight,
  getObserver,
  getDegsPerPixel,
  getCenterTime,
  ILayer,
  ImageLayer,
  TableLayer,
  PixelType,
  Header,
  getSourceCoordinates,
  getStartTime,
  getExpLength,
  toKeyValueHash,
  isImageLayer,
} from '../../../data-files/models/data-file';
import {
  Marker,
} from '../../models/marker';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  CanvasMouseEvent,
  PanZoomCanvasComponent,
  MoveByEvent,
  ZoomByEvent,
  ViewportSizeChangeEvent,
  LoadTileEvent,
  CanvasSizeChangeEvent,
  ZoomToFitEvent,
  CanvasMouseDragEvent,
} from '../../components/pan-zoom-canvas/pan-zoom-canvas.component';
import {
  MarkerMouseEvent,
  ImageViewerMarkerOverlayComponent,
} from '../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { Source, PosType } from '../../models/source';
import { CustomMarker } from '../../models/custom-marker';
import { Actions, ofActionCompleted, ofActionDispatched, Store } from '@ngxs/store';
import { DataFilesState } from '../../../data-files/data-files.state';
import { SourcesState } from '../../sources.state';
import {
  LoadRawImageTile,
  ZoomTo,
  ZoomBy,
  MoveBy,
  UpdateNormalizedImageTile,
  CenterRegionInViewport,
  UpdateCompositeImageTile,
  LoadLayerHeader,
  LoadLayer,
  LoadImageLayerHistogram,
  LoadLayerHeaderSuccess,
  UpdateCompositeImageTileSuccess,
  UpdateNormalizedImageTileSuccess,
} from '../../../data-files/data-files.actions';
import { LayerType } from '../../../data-files/models/data-file-type';
import { Transform, getImageToViewportTransform, transformToMatrix } from '../../../data-files/models/transformation';
import { IImageData, ImageTile } from '../../../data-files/models/image-data';
import { UpdateCurrentViewportSize } from '../../workbench.actions';
import { IViewer, ImageViewer } from '../../models/viewer';
import { WorkbenchState } from '../../workbench.state';
import { WorkbenchTool } from '../../models/workbench-state';
import { CustomMarkerPanelState } from '../../models/marker-file-state';
import { PlottingPanelState } from '../../models/plotter-file-state';
import { SonificationPanelState, SonifierRegionMode } from '../../models/sonifier-file-state';
import { ImageHist } from '../../../data-files/models/image-hist';
import * as moment from 'moment';
import { Papa } from 'ngx-papaparse';
import { AuthState } from '../../../auth/auth.state';
import { round } from '../../../utils/math';
import { formatDms } from '../../../utils/skynet-astro';
// @ts-ignore
import * as piexif from 'piexifjs';
import { ImageViewerEventService } from '../../services/image-viewer-event.service';
import { ImageViewerMarkerService } from '../../services/image-viewer-marker.service';

export interface ViewerCanvasMouseEvent extends CanvasMouseEvent {
  viewerId: string;
  viewer: IViewer;
  isActiveViewer: boolean;
}

export interface ViewerCanvasMouseDragEvent extends CanvasMouseDragEvent {
  viewerId: string;
  viewer: IViewer;
  isActiveViewer: boolean;
}

export interface ViewerMarkerMouseEvent extends MarkerMouseEvent {
  viewerId: string;
  viewer: IViewer;
  isActiveViewer: boolean;
}

@Component({
  selector: 'app-image-viewer',
  templateUrl: './image-viewer.component.html',
  styleUrls: ['./image-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageViewerComponent implements OnInit, OnDestroy {
  @Input('viewer')
  set viewer(viewer: ImageViewer) {
    this.viewer$.next(viewer);
  }
  get viewer() {
    return this.viewer$.getValue();
  }
  private viewer$ = new BehaviorSubject<ImageViewer>(null);

  LayerType = LayerType;

  @Input()
  showInfoBar: boolean = true;
  @Input()
  active: boolean = true;
  @Input()
  hasFocus: boolean = true;

  @Output()
  onFileClose = new EventEmitter<string>();
  @Output()
  onFileSave = new EventEmitter<string>();

  destroy$ = new Subject<boolean>();
  firstHeader$: Observable<Header>;

  rawImageData$: Observable<IImageData<PixelType>>;
  normalizedImageData$: Observable<IImageData<Uint32Array>>;
  imageToViewportTransform$: Observable<Transform>;
  customMarkerPanelState$: Observable<CustomMarkerPanelState>;
  plottingPanelState$: Observable<PlottingPanelState>;
  sonificationPanelState$: Observable<SonificationPanelState>;
  activeTool$: Observable<WorkbenchTool>;
  markers$: Observable<Marker[]>;

  @ViewChild(PanZoomCanvasComponent, { static: false })
  panZoomCanvasComponent: PanZoomCanvasComponent;

  @ViewChild(ImageViewerMarkerOverlayComponent, { static: false })
  imageViewerMarkerOverlayComponent: ImageViewerMarkerOverlayComponent;

  layerEntities$: Observable<{ [id: string]: ILayer }>;
  viewportSize: { width: number; height: number };
  currentCanvasSize: { width: number; height: number } = null;
  imageMouseX: number = null;
  imageMouseY: number = null;
  mouseDownIsActiveViewer: boolean = false;

  private lastImageData: IImageData<Uint32Array>;
  private queuedTileLoadingEvents: { imageDataId: string, tileIndex: number }[] = [];

  constructor(
    private store: Store,
    private sanitization: DomSanitizer,
    private papa: Papa,
    private eventService: ImageViewerEventService,
    private markerService: ImageViewerMarkerService,
    private actions$: Actions
  ) {
    this.layerEntities$ = this.store.select(DataFilesState.getLayerEntities);

    let viewerId$ = this.viewer$.pipe(map((viewer) => (viewer ? viewer.id : null)));

    this.markers$ = viewerId$.pipe(switchMap((viewerId) => this.markerService.getMarkerStream(viewerId)));

    let file$ = this.viewer$.pipe(
      switchMap((viewer) => (viewer?.fileId ? this.store.select(DataFilesState.getFileById(viewer.fileId)) : of(null)))
    );
    let layerIds$: Observable<string[]> = file$.pipe(
      map((file) => (file ? file.layerIds : [])),
      distinctUntilChanged((a, b) => a && b && a.length == b.length && a.every((value, index) => b[index] == value))
    );
    let selectedLayerId$ = this.viewer$.pipe(map((viewer) => viewer?.layerId));
    let layers$ = combineLatest(layerIds$, selectedLayerId$).pipe(
      switchMap(([layerIds, selectedLayerId]) => {
        if (selectedLayerId) layerIds = [selectedLayerId];
        return combineLatest(layerIds.map((layerId) => this.store.select(DataFilesState.getLayerById(layerId)))).pipe(
          map((layers) => layers.filter((layer) => layer?.type == LayerType.IMAGE) as ImageLayer[])
        );
      })
    );

    let headerIds$ = layers$.pipe(
      map((layers) => layers.map((layer) => layer.headerId)),
      distinctUntilChanged((a, b) => a && b && a.length == b.length && a.every((value, index) => b[index] == value))
    );

    let headers$ = headerIds$.pipe(
      switchMap((headerIds) => {
        return combineLatest(headerIds.map((headerId) => this.store.select(DataFilesState.getHeaderById(headerId))));
      })
    );

    this.firstHeader$ = headers$.pipe(map((headers) => (headers.length > 0 ? headers[0] : null)));

    // // watch for changes to header and reload when necessary
    // layers$.pipe(takeUntil(this.destroy$)).subscribe((layers) => {
    //   layers.forEach((layer) => {
    //     if (layer) {
    //       if (layer.hist && !layer.hist.loaded && !layer.hist.loading) {
    //         setTimeout(() => {
    //           this.store.dispatch(new LoadImageLayerHistogram(layer.id));
    //         });
    //       }
    //     }
    //   });
    // });

    // headers$.pipe(takeUntil(this.destroy$), withLatestFrom(layerIds$)).subscribe(([headers, layerIds]) => {
    //   headers.forEach((header, index) => {
    //     if (header && !header.loaded && !header.loading) {
    //       setTimeout(() => {
    //         this.store.dispatch(new LoadLayerHeader(layerIds[index]));
    //       });
    //     }
    //   });
    // });

    this.rawImageData$ = viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getRawImageDataByViewerId(viewerId)))
    );

    this.normalizedImageData$ = this.viewer$.pipe(
      switchMap((viewer) => {
        if (!viewer) return of(null);
        return viewer.layerId
          ? this.store.select(WorkbenchState.getLayerNormalizedImageDataByViewerId(viewer?.id))
          : this.store.select(WorkbenchState.getFileNormalizedImageDataByViewerId(viewer?.id));
      })
    );

    this.imageToViewportTransform$ = this.viewer$.pipe(
      switchMap((viewer) => {
        if (!viewer) return of(null);
        return viewer.layerId
          ? this.store.select(WorkbenchState.getLayerImageToViewportTransformByViewerId(viewer?.id))
          : this.store.select(WorkbenchState.getFileImageToViewportTransformByViewerId(viewer?.id));
      })
    );

    // let customMarkerPanelStateId$ = viewerId$.pipe(
    //   switchMap((viewerId) =>
    //     this.store.select(WorkbenchState.getCustomMarkerPanelStateIdFromViewerId).pipe(
    //       map((fn) => fn(viewerId)),
    //       distinctUntilChanged()
    //     )
    //   ),
    //   distinctUntilChanged()
    // );

    // this.customMarkerPanelState$ = customMarkerPanelStateId$.pipe(
    //   switchMap((id) => this.store.select(WorkbenchState.getCustomMarkerPanelStateById).pipe(map((fn) => fn(id)))),
    //   distinctUntilChanged()
    // );

    this.plottingPanelState$ = viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getPlottingPanelStateByViewerId(viewerId)))
    );

    this.sonificationPanelState$ = viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getSonificationPanelStateByViewerId(viewerId)))
    );

    let photometryPanelState$ = viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getPhotometryPanelStateByViewerId(viewerId)))
    );

    let sourcePhotometryData$ = photometryPanelState$.pipe(
      map((state) => state?.sourcePhotometryData),
      distinctUntilChanged()
    );

    this.activeTool$ = this.store.select(WorkbenchState.getActiveTool);
  }

  ngOnInit() { }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  handleImageMouseMove($event: CanvasMouseEvent) {
    if ($event.hitImage) {
      this.imageMouseX = $event.imageX;
      this.imageMouseY = $event.imageY;
    } else {
      this.imageMouseX = null;
      this.imageMouseY = null;
    }

    this.eventService.mouseMoveEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
      isActiveViewer: this.active
    });
  }

  handleImageMouseDown($event: CanvasMouseEvent) {
    if ($event.hitImage) {
      this.imageMouseX = $event.imageX;
      this.imageMouseY = $event.imageY;
    } else {
      this.imageMouseX = null;
      this.imageMouseY = null;
    }

    this.mouseDownIsActiveViewer = this.active;

    this.eventService.mouseDownEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
      isActiveViewer: this.mouseDownIsActiveViewer
    });
  }

  handleImageMouseUp($event: CanvasMouseEvent) {
    if ($event.hitImage) {
      this.imageMouseX = $event.imageX;
      this.imageMouseY = $event.imageY;
    } else {
      this.imageMouseX = null;
      this.imageMouseY = null;
    }

    this.eventService.mouseUpEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
      isActiveViewer: this.mouseDownIsActiveViewer
    });
  }

  handleImageClick($event: CanvasMouseEvent) {
    this.eventService.imageClickEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
      isActiveViewer: this.mouseDownIsActiveViewer
    });
  }

  handleMarkerClick($event: MarkerMouseEvent) {
    this.eventService.markerClickEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
      isActiveViewer: this.mouseDownIsActiveViewer
    });
  }

  handleImageDrag($event: CanvasMouseDragEvent) {
    this.eventService.mouseDragEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
      isActiveViewer: this.active
    });
  }

  handleImageDrop($event: CanvasMouseDragEvent) {
    this.eventService.mouseDropEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
      isActiveViewer: this.active
    });
  }

  handleMoveBy($event: MoveByEvent) {
    if (!this.viewer) {
      return;
    }

    let normalizedImageData = this.store.selectSnapshot(
      WorkbenchState.getNormalizedImageDataByViewerId(this.viewer.id)
    );
    let imageTransform = this.store.selectSnapshot(WorkbenchState.getImageTransformByViewerId(this.viewer.id));
    let viewportTransform = this.store.selectSnapshot(WorkbenchState.getViewportTransformByViewerId(this.viewer.id));

    if (!this.viewer.viewportSize || !normalizedImageData || !imageTransform || !viewportTransform) {
      return;
    }
    this.store.dispatch(
      new MoveBy(
        normalizedImageData.id,
        imageTransform.id,
        viewportTransform.id,
        this.viewer.viewportSize,
        $event.xShift,
        $event.yShift
      )
    );
  }

  handleZoomBy($event: ZoomByEvent) {
    if (!this.viewer) {
      return;
    }
    let normalizedImageData = this.store.selectSnapshot(
      WorkbenchState.getNormalizedImageDataByViewerId(this.viewer.id)
    );
    let imageTransform = this.store.selectSnapshot(WorkbenchState.getImageTransformByViewerId(this.viewer.id));
    let viewportTransform = this.store.selectSnapshot(WorkbenchState.getViewportTransformByViewerId(this.viewer.id));

    if (!this.viewer.viewportSize || !normalizedImageData || !imageTransform || !viewportTransform) {
      return;
    }

    this.store.dispatch(
      new ZoomBy(
        normalizedImageData.id,
        imageTransform.id,
        viewportTransform.id,
        this.viewer.viewportSize,
        $event.factor,
        $event.anchor
      )
    );
  }

  handleZoomTo($event: ZoomByEvent) {
    if (!this.viewer) {
      return;
    }
    let normalizedImageData = this.store.selectSnapshot(
      WorkbenchState.getNormalizedImageDataByViewerId(this.viewer.id)
    );
    let imageTransform = this.store.selectSnapshot(WorkbenchState.getImageTransformByViewerId(this.viewer.id));
    let viewportTransform = this.store.selectSnapshot(WorkbenchState.getViewportTransformByViewerId(this.viewer.id));

    if (!this.viewer.viewportSize || !normalizedImageData || !imageTransform || !viewportTransform) {
      return;
    }

    this.store.dispatch(
      new ZoomTo(
        normalizedImageData.id,
        imageTransform.id,
        viewportTransform.id,
        this.viewer.viewportSize,
        $event.factor,
        $event.anchor
      )
    );
  }

  handleZoomToFit($event: ZoomToFitEvent) {
    if (!this.viewer) {
      return;
    }

    let normalizedImageData = this.store.selectSnapshot(
      WorkbenchState.getNormalizedImageDataByViewerId(this.viewer.id)
    );
    let imageTransform = this.store.selectSnapshot(WorkbenchState.getImageTransformByViewerId(this.viewer.id));
    let viewportTransform = this.store.selectSnapshot(WorkbenchState.getViewportTransformByViewerId(this.viewer.id));

    if (!this.viewer.viewportSize || !normalizedImageData || !imageTransform || !viewportTransform) {
      return;
    }
    this.store.dispatch(
      new CenterRegionInViewport(
        normalizedImageData.id,
        imageTransform.id,
        viewportTransform.id,
        this.viewer.viewportSize,
        {
          x: 1,
          y: 1,
          width: normalizedImageData.width,
          height: normalizedImageData.height,
        }
      )
    );
  }

  handleCloseFile() {
    if (!this.viewer || !this.viewer.fileId) {
      return;
    }

    this.onFileClose.emit(this.viewer.fileId);
  }

  handleSaveFile() {
    if (!this.viewer || !this.viewer.fileId) {
      return;
    }

    this.onFileSave.emit(this.viewer.fileId);
  }

  handleViewportSizeChange($event: ViewportSizeChangeEvent) {
    this.viewportSize = $event;
    this.store.dispatch(new UpdateCurrentViewportSize(this.viewer.id, $event));
  }

  handleCanvasSizeChange($event: CanvasSizeChangeEvent) {
    this.currentCanvasSize = { width: $event.width, height: $event.height };
  }

  handleLoadTile($event: LoadTileEvent) {

    if (this.queuedTileLoadingEvents.find(e => e.imageDataId == $event.imageDataId && e.tileIndex == $event.tileIndex)) return;

    // console.log("LOAD TILE EVENT: ", $event.tileIndex)
    let dataFileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let layerIds = [this.viewer.layerId];
    let loadComposite = false;


    if (!this.viewer.layerId) {
      // a specific HDU has not been selected in the viewer
      let file = dataFileEntities[this.viewer.fileId];
      if (!file) return;
      layerIds = file.layerIds;
      loadComposite = true;
    }

    let layers = layerIds.map(id => this.store.selectSnapshot(DataFilesState.getLayerById(id))).filter(isImageLayer).filter(layer => !!layer)

    layers.forEach((layer) => {
      let layerId = layer.id;

      //ensure updated copies of HDU info is retrieved at the start of each loop
      let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
      let imageDataEntities = this.store.selectSnapshot(DataFilesState.getImageDataEntities);
      // console.log("CHECKING HDU: ", layerId, this.layerLoading[layerId])

      let imageLayer = layer as ImageLayer;
      let header = headerEntities[layer.headerId];
      if ((!imageLayer.loaded || !header.isValid)) {
        this.queuedTileLoadingEvents.push($event);
        this.actions$
          .pipe(
            ofActionCompleted(LoadLayer),
            filter((a) => (a.action as LoadLayer).layerId == layer.id),
            take(1)
          )
          .subscribe((a) => {
            this.queuedTileLoadingEvents.splice(this.queuedTileLoadingEvents.indexOf($event), 1);
            this.handleLoadTile($event)
          })


        if (!layer.loading) {
          this.store.dispatch(new LoadLayer(layerId));
        }



        loadComposite = false;
        return;
      }



      let imageData = imageDataEntities[(layer as ImageLayer).rgbaImageDataId];
      let tile = imageData.tiles[$event.tileIndex];
      if (!tile.pixelsLoaded || !tile.isValid) {
        this.queuedTileLoadingEvents.push($event);
        this.actions$
          .pipe(
            ofActionCompleted(UpdateNormalizedImageTile),
            filter((a) => (a.action as UpdateNormalizedImageTile).layerId == layer.id && (a.action as UpdateNormalizedImageTile).tileIndex == tile.index),
            take(1)
          )
          .subscribe((a) => {
            // console.log("update normalized tile complete!", layer.fileId, layer.id, tile.index)
            this.queuedTileLoadingEvents.splice(this.queuedTileLoadingEvents.indexOf($event), 1);
            if (a.result.successful) this.handleLoadTile($event);
          });

        if (!tile.pixelsLoading) {
          this.store.dispatch(new UpdateNormalizedImageTile(layer.id, tile.index));
        }




        loadComposite = false;
        return;


      }
    })

    // console.log("LOOP COMPLETE")

    if (loadComposite && layers.length != 0) {
      // console.log("update composite tile event", this.viewer.fileId, $event.tileIndex)
      this.store.dispatch(new UpdateCompositeImageTile(this.viewer.fileId, $event.tileIndex));
    }
  }

  handleExportImageData() {
    let imageData = this.store.selectSnapshot(
      WorkbenchState.getNormalizedImageDataByViewerId(this.viewer.id)
    );

    let invalidTiles = imageData.tiles.filter(tile => !tile.pixelsLoaded || !tile.isValid)
    if (invalidTiles.length != 0) {
      invalidTiles.forEach((tile) => this.handleLoadTile({ imageDataId: imageData.id, tileIndex: tile.index }))
      setTimeout(() => this.handleExportImageData(), 1000);
      return;
    }

    let imageCanvas: HTMLCanvasElement = document.createElement('canvas');
    let imageCtx: CanvasRenderingContext2D = imageCanvas.getContext('2d');
    imageCanvas.width = imageData.width;
    imageCanvas.height = imageData.height;




    let tiles = imageData.tiles;
    for (let tile of tiles) {
      let imageData = imageCtx.createImageData(tile.width, tile.height);
      let blendedImageDataUint8Clamped = new Uint8ClampedArray(tile.pixels.buffer);
      imageData.data.set(blendedImageDataUint8Clamped);
      imageCtx.putImageData(imageData, tile.x, tile.y);
    }

    let canvas: HTMLCanvasElement = document.createElement('canvas');
    let ctx: CanvasRenderingContext2D = canvas.getContext('2d');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    let transform = this.store.selectSnapshot(WorkbenchState.getImageTransformByViewerId(this.viewer.id));
    let matrix = transformToMatrix(transform);
    matrix.applyToContext(ctx);

    ctx.drawImage(imageCanvas, 0, 0);




    var lnk = document.createElement('a');
    if (this.viewer.layerId) {
      let layer = this.store.selectSnapshot(DataFilesState.getLayerById(this.viewer.layerId))
      lnk.download = `${layer?.name || 'afterglow-image-export'}.jpg`;
    }
    else {
      let file = this.store.selectSnapshot(DataFilesState.getFileById(this.viewer.fileId))
      lnk.download = `${file?.name || 'afterglow-image-export'}.jpg`;
    }
    let dataUrl = canvas.toDataURL('image/jpeg');
    lnk.href = dataUrl;

    /// create a "fake" click-event to trigger the download
    if (document.createEvent) {
      let e;
      e = document.createEvent('MouseEvents');
      e.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);

      lnk.dispatchEvent(e);
    }






  }

  handleDownloadSnapshot() {
    let imageCanvas = this.panZoomCanvasComponent.canvas;

    // http://svgopen.org/2010/papers/62-From_SVG_to_Canvas_and_Back/
    let markerSvg = this.imageViewerMarkerOverlayComponent.svg;
    let svgXml = new XMLSerializer().serializeToString(markerSvg);
    let data = 'data:image/svg+xml;base64,' + btoa(svgXml);

    let image = new Image();
    image.onload = () => {
      let canvas: HTMLCanvasElement = document.createElement('canvas');
      let context: CanvasRenderingContext2D = canvas.getContext('2d');
      canvas.width = imageCanvas.width;
      canvas.height = imageCanvas.height;

      context.drawImage(imageCanvas, 0, 0);
      context.drawImage(image, 0, 0);

      var lnk = document.createElement('a');

      /// the key here is to set the download attribute of the a tag
      lnk.download = 'afterglow_screenshot.jpg';

      /// convert canvas content to data-uri for link. When download
      /// attribute is set the content pointed to by link will be
      /// pushed as "download" in HTML5 capable browsers
      let dataUrl = canvas.toDataURL('image/jpeg');

      if (this.viewer.layerId) {
        let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);
        let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
        let user = this.store.selectSnapshot(AuthState.user);
        let header = headerEntities[layerEntities[this.viewer.layerId].headerId];
        if (header) {
          let zeroth = {};
          let exif = {};
          let gps = {};
          zeroth[piexif.ImageIFD.Software] = 'Afterglow Access';
          let artist = user ? `${user.firstName} ${user.lastName} (${user.username})` : '';
          let observer = getObserver(header);
          if (observer) {
            artist = artist.concat(`, ${observer}`);
          }
          zeroth[piexif.ImageIFD.Artist] = artist;

          // let headerStr =  header.entries.reduce((value, entry) => value.concat(`${entry.key}: ${entry.value} - ${entry.comment} | `), "")
          // // let headerStr = this.papa.unparse(header.entries, {
          // //   columns: ['key', 'value', 'comment']
          // // })
          // zeroth[piexif.ImageIFD.ImageDescription] = headerStr;
          // let expTime = getExpLength(header);
          // if(typeof expTime !== 'undefined') {
          //   zeroth[piexif.ImageIFD.ExposureTime] = expTime;
          // }
          let startTime = getStartTime(header);
          if (startTime) {
            exif[piexif.ExifIFD.DateTimeOriginal] = moment.utc(startTime).format('YYYY:MM:DD HH:mm:ss');
          }
          let exifObj = { '0th': zeroth, Exif: exif, GPS: gps };
          let exifStr = piexif.dump(exifObj);
          dataUrl = piexif.insert(exifStr, dataUrl);
        }
      }

      lnk.href = dataUrl;

      /// create a "fake" click-event to trigger the download
      if (document.createEvent) {
        let e;
        e = document.createEvent('MouseEvents');
        e.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);

        lnk.dispatchEvent(e);
      }
    };
    image.src = data;
  }

  test() {
    console.log(this.lastImageData == this.panZoomCanvasComponent.imageData);
  }
}
