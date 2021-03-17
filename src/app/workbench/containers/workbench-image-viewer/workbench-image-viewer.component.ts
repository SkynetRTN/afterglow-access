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
import { distinctUntilChanged, map, flatMap, filter, withLatestFrom, tap, switchMap, takeUntil } from 'rxjs/operators';
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
import { Store } from '@ngxs/store';
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

@Component({
  selector: 'app-workbench-image-viewer',
  templateUrl: './workbench-image-viewer.component.html',
  styleUrls: ['./workbench-image-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkbenchImageViewerComponent implements OnInit, OnChanges, OnDestroy {
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
  onImageClick = new EventEmitter<CanvasMouseEvent>();
  @Output()
  onImageMouseMove = new EventEmitter<CanvasMouseEvent>();
  @Output()
  onImageMouseDown = new EventEmitter<CanvasMouseEvent>();
  @Output()
  onImageMouseUp = new EventEmitter<CanvasMouseEvent>();
  @Output()
  onImageMouseDragStart = new EventEmitter<CanvasMouseDragEvent>();
  @Output()
  onImageMouseDrag = new EventEmitter<CanvasMouseDragEvent>();
  @Output()
  onImageMouseDragEnd = new EventEmitter<CanvasMouseDragEvent>();
  @Output()
  onMarkerClick = new EventEmitter<MarkerMouseEvent>();
  @Output()
  onFileClose = new EventEmitter<string>();
  @Output()
  onFileSave = new EventEmitter<string>();

  destroy$: Subject<boolean> = new Subject<boolean>();
  file$: Observable<DataFile>;
  hduIds$: Observable<string[]>;
  hdus$: Observable<ImageHdu[]>;
  headerIds$: Observable<string[]>;
  headers$: Observable<Header[]>;
  headersLoaded$: Observable<boolean>;
  histsLoaded$: Observable<boolean>;
  ready$: Observable<boolean>;

  selectedHduId$: Observable<string>;
  selectedHdu$: Observable<ImageHdu>;
  selectedHduHeader$: Observable<Header>;
  firstHeader$: Observable<Header>;

  rawImageData$: Observable<IImageData<PixelType>>;
  normalizedImageData$: Observable<IImageData<Uint32Array>>;
  imageTransform$: Observable<Transform>;
  viewportTransform$: Observable<Transform>;
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
  tableData: any = null;
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

  constructor(private store: Store, private sanitization: DomSanitizer, private papa: Papa) {
    this.hduEntities$ = this.store.select(DataFilesState.getHduEntities);

    let viewerId$ = this.viewer$.pipe(
      map((viewer) => (viewer ? viewer.id : null)),
      distinctUntilChanged()
    );

    this.selectedHduId$ = this.viewer$.pipe(
      map((viewer) => (viewer ? viewer.hduId : null)),
      distinctUntilChanged()
    );

    this.file$ = this.viewer$.pipe(
      switchMap((viewer) => this.store.select(DataFilesState.getFileById).pipe(map((fn) => fn(viewer.fileId)))),
      distinctUntilChanged()
    );

    this.hduIds$ = this.file$.pipe(
      map((file) => file.hduIds),
      distinctUntilChanged((a, b) => a && b && a.length == b.length && a.every((value, index) => b[index] == value))
    );

    this.hdus$ = this.hduIds$.pipe(
      switchMap((hduIds) => {
        return combineLatest(
          hduIds.map((hduId) => this.store.select(DataFilesState.getHduById).pipe(map((fn) => fn(hduId))))
        ).pipe(map((hdus) => hdus.filter((hdu) => hdu.hduType == HduType.IMAGE) as ImageHdu[]));
      })
    );

    this.headerIds$ = this.hdus$.pipe(
      map((hdus) => hdus.map((hdu) => hdu.headerId)),
      distinctUntilChanged((a, b) => a && b && a.length == b.length && a.every((value, index) => b[index] == value))
    );

    this.headers$ = this.headerIds$.pipe(
      switchMap((headerIds) => {
        return combineLatest(
          headerIds.map((headerId) => this.store.select(DataFilesState.getHeaderById).pipe(map((fn) => fn(headerId))))
        );
      })
    );

    this.selectedHdu$ = combineLatest([this.selectedHduId$, this.hdus$]).pipe(
      map(([hduId, hdus]) => (hduId ? hdus.find((hdu) => hdu.id == hduId) : null))
    );

    this.selectedHduHeader$ = combineLatest([this.selectedHdu$, this.headers$]).pipe(
      map(([hdu, headers]) => (hdu ? headers.find((header) => header.id == hdu.headerId) : null))
    );

    this.headersLoaded$ = combineLatest([this.headers$, this.selectedHduHeader$]).pipe(
      map(([headers, header]) => (header ? header.loaded : headers.every((header) => header.loaded)))
    );

    this.histsLoaded$ = combineLatest([this.hdus$, this.selectedHdu$]).pipe(
      map(([hdus, hdu]) => (hdu ? hdu.hist.loaded : hdus.every((hdu) => hdu.hist.loaded)))
    );

    this.ready$ = combineLatest([this.headersLoaded$, this.histsLoaded$]).pipe(
      map(([headerLoaded, histLoaded]) => headerLoaded && histLoaded)
    );

    this.firstHeader$ = this.headers$.pipe(map((headers) => (headers.length > 0 ? headers[0] : null)));

    // // watch for changes to header and reload when necessary
    // combineLatest([this.hduId$, this.header$]).pipe(
    //   takeUntil(this.destroy$)
    // ).subscribe(([hduId, header]) => {
    //   if (hduId && header && !header.loaded && !header.loading) {
    //     setTimeout(() => {
    //       this.store.dispatch(new LoadHduHeader(hduId));
    //     })

    //   }
    // });

    // combineLatest([this.hduId$, this.histLoaded$, this.histLoading$]).pipe(
    //   takeUntil(this.destroy$)
    // ).subscribe(([hduId, histLoaded, histLoading]) => {
    //   if (hduId && !histLoaded && !histLoading ) {
    //     setTimeout(() => {
    //       this.store.dispatch(new LoadImageHduHistogram(hduId));
    //     })

    //   }
    // });

    let rawImageDataId$ = viewerId$.pipe(
      switchMap((viewerId) =>
        this.store.select(WorkbenchState.getRawImageDataIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged()
        )
      )
    );

    this.rawImageData$ = rawImageDataId$.pipe(
      switchMap((imageDataId) =>
        this.store.select(DataFilesState.getImageDataById).pipe(map((fn) => fn(imageDataId) as IImageData<PixelType>))
      ),
      distinctUntilChanged()
    );

    let normalizedImageDataId$ = viewerId$.pipe(
      switchMap((viewerId) =>
        this.store.select(WorkbenchState.getNormalizedImageDataIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged()
        )
      ),
      distinctUntilChanged()
    );

    this.normalizedImageData$ = normalizedImageDataId$.pipe(
      switchMap((imageDataId) =>
        this.store.select(DataFilesState.getImageDataById).pipe(map((fn) => fn(imageDataId) as IImageData<Uint32Array>))
      ),
      distinctUntilChanged()
    );

    let viewportTransformId$ = viewerId$.pipe(
      switchMap((viewerId) =>
        this.store.select(WorkbenchState.getViewportTransformIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged()
        )
      ),
      distinctUntilChanged()
    );

    this.viewportTransform$ = viewportTransformId$.pipe(
      switchMap((transformId) => this.store.select(DataFilesState.getTransformById).pipe(map((fn) => fn(transformId)))),
      distinctUntilChanged()
    );

    let imageTransformId$ = viewerId$.pipe(
      switchMap((viewerId) =>
        this.store.select(WorkbenchState.getImageTransformIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged()
        )
      ),
      distinctUntilChanged()
    );

    this.imageTransform$ = imageTransformId$.pipe(
      switchMap((transformId) => this.store.select(DataFilesState.getTransformById).pipe(map((fn) => fn(transformId)))),
      distinctUntilChanged()
    );

    this.imageToViewportTransform$ = combineLatest(this.imageTransform$, this.viewportTransform$).pipe(
      map(([imageTransform, viewportTransform]) => {
        if (!imageTransform || !viewportTransform) {
          return null;
        }
        return getImageToViewportTransform(viewportTransform, imageTransform);
      })
    );

    let customMarkerPanelStateId$ = viewerId$.pipe(
      switchMap((viewerId) =>
        this.store.select(WorkbenchState.getCustomMarkerPanelStateIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged()
        )
      ),
      distinctUntilChanged()
    );

    this.customMarkerPanelState$ = customMarkerPanelStateId$.pipe(
      switchMap((id) => this.store.select(WorkbenchState.getCustomMarkerPanelStateById).pipe(map((fn) => fn(id)))),
      distinctUntilChanged()
    );

    let plottingPanelStateId$ = viewerId$.pipe(
      switchMap((viewerId) =>
        this.store.select(WorkbenchState.getPlottingPanelStateIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged()
        )
      ),
      distinctUntilChanged()
    );

    this.plottingPanelState$ = plottingPanelStateId$.pipe(
      switchMap((id) => this.store.select(WorkbenchState.getPlottingPanelStateById).pipe(map((fn) => fn(id)))),
      distinctUntilChanged()
    );

    let sonificationPanelStateId$ = viewerId$.pipe(
      switchMap((viewerId) =>
        this.store.select(WorkbenchState.getSonificationPanelStateIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged()
        )
      ),
      distinctUntilChanged()
    );

    this.sonificationPanelState$ = sonificationPanelStateId$.pipe(
      switchMap((id) => this.store.select(WorkbenchState.getSonificationPanelStateById).pipe(map((fn) => fn(id)))),
      distinctUntilChanged()
    );

    let photometryPanelStateId$ = viewerId$.pipe(
      switchMap((viewerId) =>
        this.store.select(WorkbenchState.getPhotometryPanelStateIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged()
        )
      ),
      distinctUntilChanged()
    );

    let photometryPanelState$ = photometryPanelStateId$.pipe(
      switchMap((id) => this.store.select(WorkbenchState.getPhotometryPanelStateById).pipe(map((fn) => fn(id)))),
      distinctUntilChanged()
    );

    let sourcePhotometryData$ = photometryPanelState$.pipe(
      map((state) => state?.sourcePhotometryData),
      distinctUntilChanged()
    );

    this.activeTool$ = this.store.select(WorkbenchState.getActiveTool);
    this.sources$ = this.store.select(SourcesState.getSources);

    this.markers$ = this.activeTool$.pipe(
      switchMap((activeTool) => {
        if (activeTool == WorkbenchTool.CUSTOM_MARKER) {
          return this.customMarkerPanelState$.pipe(map((state) => Object.values(state.markerEntities)));
        } else if (activeTool == WorkbenchTool.PLOTTER) {
          return combineLatest(
            this.firstHeader$,
            this.selectedHduHeader$,
            this.plottingPanelState$,
            this.store.select(WorkbenchState.getPlottingPanelConfig)
          ).pipe(
            map(([firstHeader, selectedHeader, plottingState, config]) => {
              let header = selectedHeader;
              if (!header) {
                header = firstHeader;
              }
              if (!plottingState || !header) {
                return [];
              }

              let lineMeasureStart = plottingState.lineMeasureStart;
              let lineMeasureEnd = plottingState.lineMeasureEnd;
              if (!lineMeasureStart || !lineMeasureEnd) {
                return [];
              }

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
                if (!header.loaded || !header.wcs.isValid()) {
                  return [];
                }
                let wcs = header.wcs;
                if (startPosType == PosType.SKY) {
                  let xy = wcs.worldToPix([startPrimaryCoord, startSecondaryCoord]);
                  x1 = Math.max(Math.min(xy[0], getWidth(header)), 0);
                  y1 = Math.max(Math.min(xy[1], getHeight(header)), 0);
                }

                if (endPosType == PosType.SKY) {
                  let xy = wcs.worldToPix([endPrimaryCoord, endSecondaryCoord]);
                  x2 = Math.max(Math.min(xy[0], getWidth(header)), 0);
                  y2 = Math.max(Math.min(xy[1], getHeight(header)), 0);
                }
              }
              let markers: Marker[] = [];
              if (config.plotMode == '1D') {
                let lineMarker: LineMarker = {
                  id: `PLOTTING_MARKER_${this.viewer.fileId}_${this.viewer.hduId}`,
                  type: MarkerType.LINE,
                  x1: x1,
                  y1: y1,
                  x2: x2,
                  y2: y2,
                };

                markers = [lineMarker];
              } else {
                let rectangleMarker: RectangleMarker = {
                  id: `PLOTTING_MARKER_${this.viewer.fileId}_${this.viewer.hduId}`,
                  type: MarkerType.RECTANGLE,
                  x: Math.min(x1, x2),
                  y: Math.min(y1, y2),
                  width: Math.abs(x2 - x1),
                  height: Math.abs(y2 - y1),
                };
                markers = [rectangleMarker];
              }
              return markers;
            })
          );
        } else if (activeTool == WorkbenchTool.SONIFIER) {
          return this.sonificationPanelState$.pipe(
            map((state) => {
              if (!state) {
                return [];
              }

              let region = state.regionHistory[state.regionHistoryIndex];
              let regionMode = state.regionMode;
              let progressLine = state.progressLine;
              let markers: Array<RectangleMarker | LineMarker> = [];
              if (region && regionMode == SonifierRegionMode.CUSTOM)
                markers.push({
                  id: `SONIFICATION_REGION_${this.viewer.id}`,
                  type: MarkerType.RECTANGLE,
                  ...region,
                } as RectangleMarker);
              if (progressLine)
                markers.push({
                  id: `SONIFICATION_PROGRESS_${this.viewer.id}`,
                  type: MarkerType.LINE,
                  ...progressLine,
                } as LineMarker);
              return markers;
            })
          );
        } else if (activeTool == WorkbenchTool.PHOTOMETRY) {
          let sourceSelectionRegionMarkers$ = combineLatest(this.selectedHduId$, photometryPanelState$).pipe(
            map(([hduId, state]) => {
              if (!state || !state.markerSelectionRegion) return [];
              let region = state.markerSelectionRegion;
              let sourceSelectionMarker: RectangleMarker = {
                id: `PHOTOMETRY_SOURCE_SELECTION_${hduId}`,
                x: Math.min(region.x, region.x + region.width),
                y: Math.min(region.y, region.y + region.height),
                width: Math.abs(region.width),
                height: Math.abs(region.height),
                type: MarkerType.RECTANGLE,
              };
              return [sourceSelectionMarker];
            })
          );
          let sourceMarkers$ = combineLatest(
            this.selectedHduId$,
            this.firstHeader$,
            this.store.select(WorkbenchState.getPhotometryPanelConfig),
            this.store.select(SourcesState.getSources),
            sourcePhotometryData$
          ).pipe(
            map(([hduId, header, config, sources, sourcePhotometryData]) => {
              if (!header || !sourcePhotometryData) return [];

              let selectedSourceIds = config.selectedSourceIds;
              let coordMode = config.coordMode;
              let showSourcesFromAllFiles = config.showSourcesFromAllFiles;
              let showSourceLabels = config.showSourceLabels;

              let markers: Array<CircleMarker | TeardropMarker | ApertureMarker | RectangleMarker> = [];
              let mode = coordMode;

              if (!header.wcs || !header.wcs.isValid()) mode = 'pixel';

              sources.forEach((source) => {
                if (source.hduId != hduId && !showSourcesFromAllFiles) return;
                if (source.posType != mode) return;
                let selected = selectedSourceIds.includes(source.id);
                let coord = getSourceCoordinates(header, source);

                if (coord == null) {
                  return;
                }

                let photData = sourcePhotometryData[source.id];
                if (photData && photData.x !== null && photData.y !== null && photData.aperA !== null) {
                  let tooltipMessage = [];
                  if (photData.raHours !== null && photData.decDegs !== null) {
                    tooltipMessage.push(
                      `RA,DEC: (${formatDms(photData.raHours, 2, 3)}, ${formatDms(photData.decDegs, 2, 3)})`
                    );
                  }
                  if (photData.x !== null && photData.y !== null) {
                    tooltipMessage.push(`X,Y: (${round(photData.x, 3)}, ${round(photData.y, 3)})`);
                  }

                  if (photData.mag !== null && photData.magError !== null) {
                    tooltipMessage.push(`${round(photData.mag, 3)} +/- ${round(photData.magError, 3)} mag`);
                  }

                  let apertureMarker: ApertureMarker = {
                    id: `PHOTOMETRY_SOURCE_${hduId}_${source.id}`,
                    type: MarkerType.APERTURE,
                    x: photData.x,
                    y: photData.y,
                    apertureA: photData.aperA,
                    apertureB: photData.aperB,
                    apertureTheta: photData.aperTheta,
                    annulusAIn: photData.annulusAIn,
                    annulusBIn: photData.annulusBIn,
                    annulusAOut: photData.annulusAOut,
                    annulusBOut: photData.annulusBOut,
                    labelTheta: 0,
                    labelRadius: Math.max(photData.annulusAOut, photData.annulusBOut) + 15,
                    label: showSourceLabels ? source.label : '',
                    selected: selected,
                    data: { source: source },
                    tooltip: {
                      class: 'photometry-data-tooltip',
                      message: tooltipMessage.join('\n'),
                      showDelay: 500,
                      hideDelay: null,
                    },
                  };

                  markers.push(apertureMarker);
                } else {
                  if (source.pm) {
                    markers.push({
                      id: `PHOTOMETRY_SOURCE_${hduId}_${source.id}`,
                      type: MarkerType.TEARDROP,
                      x: coord.x,
                      y: coord.y,
                      radius: 15,
                      labelRadius: 30,
                      labelTheta: 0,
                      label: showSourceLabels ? source.label : '',
                      theta: coord.theta,
                      selected: selected,
                      data: { source: source },
                    } as TeardropMarker);
                  } else {
                    markers.push({
                      id: `PHOTOMETRY_SOURCE_${hduId}_${source.id}`,
                      type: MarkerType.CIRCLE,
                      x: coord.x,
                      y: coord.y,
                      radius: 15,
                      labelRadius: 30,
                      labelTheta: 0,
                      label: showSourceLabels ? source.label : '',
                      selected: selected,
                      data: { source: source },
                    } as CircleMarker);
                  }
                }
              });
              return markers;
            })
          );

          return combineLatest(sourceSelectionRegionMarkers$, sourceMarkers$).pipe(
            map(([sourceSelectionRegionMarkers, sourceMarkers]) => sourceMarkers.concat(sourceSelectionRegionMarkers))
          );
        }

        return of([]);
      })
    );
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  ngOnChanges(changes: { [key: string]: SimpleChange }) {}

  handleImageMouseMove($event: CanvasMouseEvent) {
    if ($event.hitImage) {
      this.imageMouseX = $event.imageX;
      this.imageMouseY = $event.imageY;
    } else {
      this.imageMouseX = null;
      this.imageMouseY = null;
    }

    this.onImageMouseMove.emit($event);
  }

  handleImageMouseDown($event: CanvasMouseEvent) {
    if ($event.hitImage) {
      this.imageMouseX = $event.imageX;
      this.imageMouseY = $event.imageY;
    } else {
      this.imageMouseX = null;
      this.imageMouseY = null;
    }

    this.onImageMouseDown.emit($event);
  }

  handleImageMouseUp($event: CanvasMouseEvent) {
    if ($event.hitImage) {
      this.imageMouseX = $event.imageX;
      this.imageMouseY = $event.imageY;
    } else {
      this.imageMouseX = null;
      this.imageMouseY = null;
    }

    this.onImageMouseUp.emit($event);
  }

  handleImageClick($event: CanvasMouseEvent) {
    this.onImageClick.emit($event);
  }

  handleMarkerClick($event: MarkerMouseEvent) {
    this.onMarkerClick.emit($event);
  }

  handleMoveBy($event: MoveByEvent) {
    if (!this.viewer) {
      return;
    }
    let normalizedImageDataId = this.store.selectSnapshot(WorkbenchState.getNormalizedImageDataIdFromViewerId)(
      this.viewer.id
    );
    let imageTransformId = this.store.selectSnapshot(WorkbenchState.getImageTransformIdFromViewerId)(this.viewer.id);
    let viewportTransformId = this.store.selectSnapshot(WorkbenchState.getViewportTransformIdFromViewerId)(
      this.viewer.id
    );

    if (!this.viewer.viewportSize || !normalizedImageDataId || !imageTransformId || !viewportTransformId) {
      return;
    }
    this.store.dispatch(
      new MoveBy(
        normalizedImageDataId,
        imageTransformId,
        viewportTransformId,
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
    let normalizedImageDataId = this.store.selectSnapshot(WorkbenchState.getNormalizedImageDataIdFromViewerId)(
      this.viewer.id
    );
    let imageTransformId = this.store.selectSnapshot(WorkbenchState.getImageTransformIdFromViewerId)(this.viewer.id);
    let viewportTransformId = this.store.selectSnapshot(WorkbenchState.getViewportTransformIdFromViewerId)(
      this.viewer.id
    );
    if (!this.viewer.viewportSize || !normalizedImageDataId || !imageTransformId || !viewportTransformId) return;
    this.store.dispatch(
      new ZoomBy(
        normalizedImageDataId,
        imageTransformId,
        viewportTransformId,
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
    let normalizedImageDataId = this.store.selectSnapshot(WorkbenchState.getNormalizedImageDataIdFromViewerId)(
      this.viewer.id
    );
    let imageTransformId = this.store.selectSnapshot(WorkbenchState.getImageTransformIdFromViewerId)(this.viewer.id);
    let viewportTransformId = this.store.selectSnapshot(WorkbenchState.getViewportTransformIdFromViewerId)(
      this.viewer.id
    );

    if (!this.viewer.viewportSize || !normalizedImageDataId || !imageTransformId || !viewportTransformId) return;
    this.store.dispatch(
      new ZoomTo(
        normalizedImageDataId,
        imageTransformId,
        viewportTransformId,
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
    let normalizedImageDataId = this.store.selectSnapshot(WorkbenchState.getNormalizedImageDataIdFromViewerId)(
      this.viewer.id
    );
    let normalizedImageData = this.store.selectSnapshot(DataFilesState.getImageDataEntities)[normalizedImageDataId];
    let imageTransformId = this.store.selectSnapshot(WorkbenchState.getImageTransformIdFromViewerId)(this.viewer.id);
    let viewportTransformId = this.store.selectSnapshot(WorkbenchState.getViewportTransformIdFromViewerId)(
      this.viewer.id
    );

    if (!this.viewer.viewportSize || !normalizedImageDataId || !imageTransformId || !viewportTransformId) return;
    this.store.dispatch(
      new CenterRegionInViewport(
        normalizedImageDataId,
        imageTransformId,
        viewportTransformId,
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
      if (
        !hdu ||
        hdu.hduType != HduType.IMAGE ||
        !headerEntities[hdu.headerId] ||
        !headerEntities[hdu.headerId].loaded ||
        !(hdu as ImageHdu).hist ||
        !(hdu as ImageHdu).hist.loaded
      )
        return;

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
      if (!rawTile.pixelsLoading && !rawTile.pixelLoadingFailed && (!tile.isValid || !tile.pixelsLoaded)) {
        loadComposite = false;
        this.store.dispatch(new UpdateNormalizedImageTile(hdu.id, tile.index));
      }
    });

    if (loadComposite) {
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
            exif[piexif.ExifIFD.DateTimeOriginal] = moment(startTime).format('YYYY:MM:DD HH:mm:ss');
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
}
