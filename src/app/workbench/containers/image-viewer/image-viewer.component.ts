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

import { Observable, combineLatest, of } from 'rxjs';
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
  IHdu,
  ImageHdu,
  TableHdu,
  PixelType,
  Header,
  getSourceCoordinates,
  getStartTime,
  getExpLength,
  toKeyValueHash,
} from '../../../data-files/models/data-file';
import {
  Marker,
  LineMarker,
  MarkerType,
  TeardropMarker,
  CircleMarker,
  RectangleMarker,
  ApertureMarker,
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
import { FieldCal } from '../../models/field-cal';
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
  LoadHduHeader,
  LoadHdu,
  LoadImageHduHistogram,
  LoadHduHeaderSuccess,
} from '../../../data-files/data-files.actions';
import { HduType } from '../../../data-files/models/data-file-type';
import { Transform, getImageToViewportTransform } from '../../../data-files/models/transformation';
import { IImageData } from '../../../data-files/models/image-data';
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
}

export interface ViewerCanvasMouseDragEvent extends CanvasMouseDragEvent {
  viewerId: string;
  viewer: IViewer;
}

export interface ViewerMarkerMouseEvent extends MarkerMouseEvent {
  viewerId: string;
  viewer: IViewer;
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

  HduType = HduType;

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

  hduEntities$: Observable<{ [id: string]: IHdu }>;
  viewportSize: { width: number; height: number };
  currentCanvasSize: { width: number; height: number } = null;
  imageMouseX: number = null;
  imageMouseY: number = null;

  private lastImageData: IImageData<Uint32Array>;

  constructor(
    private store: Store,
    private sanitization: DomSanitizer,
    private papa: Papa,
    private eventService: ImageViewerEventService,
    private markerService: ImageViewerMarkerService,
    private actions$: Actions
  ) {
    this.hduEntities$ = this.store.select(DataFilesState.getHduEntities);

    let viewerId$ = this.viewer$.pipe(map((viewer) => (viewer ? viewer.id : null)));

    this.markers$ = viewerId$.pipe(switchMap((viewerId) => this.markerService.getMarkerStream(viewerId)));

    let file$ = this.viewer$.pipe(
      switchMap((viewer) => (viewer?.fileId ? this.store.select(DataFilesState.getFileById(viewer.fileId)) : of(null)))
    );
    let hduIds$: Observable<string[]> = file$.pipe(
      map((file) => (file ? file.hduIds : [])),
      distinctUntilChanged((a, b) => a && b && a.length == b.length && a.every((value, index) => b[index] == value))
    );
    let selectedHduId$ = this.viewer$.pipe(map((viewer) => viewer?.hduId));
    let hdus$ = combineLatest(hduIds$, selectedHduId$).pipe(
      switchMap(([hduIds, selectedHduId]) => {
        if (selectedHduId) hduIds = [selectedHduId];
        return combineLatest(hduIds.map((hduId) => this.store.select(DataFilesState.getHduById(hduId)))).pipe(
          map((hdus) => hdus.filter((hdu) => hdu.type == HduType.IMAGE) as ImageHdu[])
        );
      })
    );

    let headerIds$ = hdus$.pipe(
      map((hdus) => hdus.map((hdu) => hdu.headerId)),
      distinctUntilChanged((a, b) => a && b && a.length == b.length && a.every((value, index) => b[index] == value))
    );

    let headers$ = headerIds$.pipe(
      switchMap((headerIds) => {
        return combineLatest(headerIds.map((headerId) => this.store.select(DataFilesState.getHeaderById(headerId))));
      })
    );

    this.firstHeader$ = headers$.pipe(map((headers) => (headers.length > 0 ? headers[0] : null)));

    // // watch for changes to header and reload when necessary
    // hdus$.pipe(takeUntil(this.destroy$)).subscribe((hdus) => {
    //   hdus.forEach((hdu) => {
    //     if (hdu) {
    //       if (hdu.hist && !hdu.hist.loaded && !hdu.hist.loading) {
    //         setTimeout(() => {
    //           this.store.dispatch(new LoadImageHduHistogram(hdu.id));
    //         });
    //       }
    //     }
    //   });
    // });

    // headers$.pipe(takeUntil(this.destroy$), withLatestFrom(hduIds$)).subscribe(([headers, hduIds]) => {
    //   headers.forEach((header, index) => {
    //     if (header && !header.loaded && !header.loading) {
    //       setTimeout(() => {
    //         this.store.dispatch(new LoadHduHeader(hduIds[index]));
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
        return viewer.hduId
          ? this.store.select(WorkbenchState.getHduNormalizedImageDataByViewerId(viewer?.id))
          : this.store.select(WorkbenchState.getFileNormalizedImageDataByViewerId(viewer?.id));
      })
    );

    this.imageToViewportTransform$ = this.viewer$.pipe(
      switchMap((viewer) => {
        if (!viewer) return of(null);
        return viewer.hduId
          ? this.store.select(WorkbenchState.getHduImageToViewportTransformByViewerId(viewer?.id))
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

  ngOnInit() {}

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

    this.eventService.mouseDownEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
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
    });
  }

  handleImageClick($event: CanvasMouseEvent) {
    this.eventService.imageClickEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
    });
  }

  handleMarkerClick($event: MarkerMouseEvent) {
    this.eventService.markerClickEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
    });
  }

  handleImageDrag($event: CanvasMouseDragEvent) {
    this.eventService.mouseDragEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
    });
  }

  handleImageDrop($event: CanvasMouseDragEvent) {
    this.eventService.mouseDropEvent$.next({
      viewerId: this.viewer.id,
      viewer: this.viewer,
      ...$event,
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
    // should only need to load the raw data
    // the normalized and composite data will be updated automatically
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
    let dataFileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let imageDataEntities = this.store.selectSnapshot(DataFilesState.getImageDataEntities);
    let hduIds = [this.viewer.hduId];
    let loadComposite = false;

    if (!this.viewer.hduId) {
      let file = dataFileEntities[this.viewer.fileId];
      if (!file) return;
      hduIds = file.hduIds;
      loadComposite = true;
    }

    hduIds.forEach((hduId) => {
      let hdu = hduEntities[hduId];
      if (!hdu || hdu.type != HduType.IMAGE) return;

      let imageHdu = hdu as ImageHdu;
      if (!imageHdu.hist.loaded) {
        console.log("waiting for hist...", $event)
        this.actions$
          .pipe(
            ofActionCompleted(LoadImageHduHistogram),
            filter((a) => (a.action as LoadImageHduHistogram).hduId == hdu.id),
            take(1)
          )
          .subscribe((a) => {
            console.log("load hist complete!", a, $event)
            if (a.result.successful) this.handleLoadTile($event);
          });

        if(!imageHdu.hist.loading) this.store.dispatch(new LoadImageHduHistogram(hdu.id));
        return;
      }

      let header = headerEntities[hdu.headerId];
      if (!header.loaded) {
        console.log("waiting for header...", $event)
        this.actions$
          .pipe(
            ofActionCompleted(LoadHduHeader),
            filter((a) => (a.action as LoadHduHeader).hduId == hdu.id),
            take(1)
          )
          .subscribe((a) => {
            console.log("load header complete!", a, $event)
            if (a.result.successful) this.handleLoadTile($event);
          });

        if(!header.loading) this.store.dispatch(new LoadHduHeader(hdu.id));
        return;
      }

      
      if (!imageHdu.hist?.loaded || !header?.loaded) {
        console.log("header or hist not loaded", !imageHdu.hist?.loaded, !header?.loaded)
        return
      };



      let normalizedImageData = imageDataEntities[(hdu as ImageHdu).imageDataId];
      if (!normalizedImageData || !normalizedImageData.initialized) {
        loadComposite = false;
        return;
      }
      let rawImageData = imageDataEntities[(hdu as ImageHdu).rawImageDataId];
      if (!rawImageData || !rawImageData.initialized) {
        loadComposite = false;
        return;
      }
      let rawTile = rawImageData.tiles[$event.tileIndex];
      let tile = normalizedImageData.tiles[$event.tileIndex];
      if (!tile.pixelsLoaded) {
        loadComposite = false;
      }
      if (!rawTile.pixelsLoading && !rawTile.pixelLoadingFailed && !tile.pixelsLoading && (!tile.isValid || !tile.pixelsLoaded)) {
        loadComposite = false;
        console.log("updating normalized tile", $event)
        this.store.dispatch(new UpdateNormalizedImageTile(hdu.id, tile.index));
      }

    });

    if (loadComposite) {
      console.log("updating composite tile", $event)
      this.store.dispatch(new UpdateCompositeImageTile(this.viewer.fileId, $event.tileIndex));
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

      if (this.viewer.hduId) {
        let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
        let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
        let user = this.store.selectSnapshot(AuthState.user);
        let header = headerEntities[hduEntities[this.viewer.hduId].headerId];
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
