import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  OnInit,
  HostBinding,
  Input,
  SimpleChanges,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

import { Observable, Subscription, Subject, BehaviorSubject, combineLatest, of, merge } from 'rxjs';
import { map, withLatestFrom, switchMap, distinctUntilChanged, takeUntil, tap, skip } from 'rxjs/operators';
import {
  getDegsPerPixel,
  DataFile,
  ImageHdu,
  PixelType,
  Header,
  getWidth,
  getHeight,
  IHdu,
} from '../../../data-files/models/data-file';
import { PlottingPanelState } from '../../models/plotter-file-state';
import { PlotterComponent } from '../../components/plotter/plotter.component';
import { PlottingPanelConfig } from '../../models/workbench-state';
import { PosType } from '../../models/source';
import { Router } from '@angular/router';
import { MarkerMouseEvent } from '../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { Store, Actions } from '@ngxs/store';
import { IImageData } from '../../../data-files/models/image-data';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { DataFilesState } from '../../../data-files/data-files.state';
import { WorkbenchState } from '../../workbench.state';
import { HduType } from '../../../data-files/models/data-file-type';
import { WorkbenchFileState, WorkbenchImageHduState, WorkbenchStateType } from '../../models/workbench-file-state';
import { centroidDisk, centroidPsf } from '../../models/centroider';
import { StartLine, UpdateLine, UpdatePlottingPanelConfig } from '../../workbench.actions';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { ImageViewerEventService } from '../../services/image-viewer-event.service';
import { ImageViewerMarkerService } from '../../services/image-viewer-marker.service';
import { LineMarker, Marker, MarkerType, RectangleMarker } from '../../models/marker';

@Component({
  selector: 'app-plotting-panel',
  templateUrl: './plotting-panel.component.html',
  styleUrls: ['./plotting-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlottingPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input('viewerId')
  set viewerId(viewer: string) {
    this.viewerId$.next(viewer);
  }
  get viewerId() {
    return this.viewerId$.getValue();
  }
  protected viewerId$ = new BehaviorSubject<string>(null);

  destroy$ = new Subject<boolean>();
  file$: Observable<DataFile>;
  hdu$: Observable<IHdu>;
  header$: Observable<Header>;
  rawImageData$: Observable<IImageData<PixelType>>;
  normalizedImageData$: Observable<IImageData<Uint32Array>>;
  imageData$: Observable<IImageData<PixelType>>;
  state$: Observable<PlottingPanelState>;
  config$: Observable<PlottingPanelConfig>;
  dataSource$: Observable<'raw' | 'normalized'>;
  colorMode$: Observable<'grayscale' | 'rgba'>;
  @ViewChild('plotter') plotter: PlotterComponent;
  PosType = PosType;
  HduType = HduType;
  lineStart$: Observable<{
    x: number;
    y: number;
    raHours: number;
    decDegs: number;
  }>;
  lineEnd$: Observable<{
    x: number;
    y: number;
    raHours: number;
    decDegs: number;
  }>;
  vectorInfo$: Observable<{
    pixelSeparation: number;
    pixelPosAngle: number;
    skySeparation: number;
    skyPosAngle: number;
  }>;

  constructor(
    private store: Store,
    private eventService: ImageViewerEventService,
    private markerService: ImageViewerMarkerService
  ) {
    this.file$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getFileByViewerId(viewerId)))
    );

    this.hdu$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getHduByViewerId(viewerId)))
    );

    this.header$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getHeaderByViewerId(viewerId)))
    );

    this.rawImageData$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getRawImageDataByViewerId(viewerId)))
    );

    this.normalizedImageData$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getNormalizedImageDataByViewerId(viewerId)))
    );

    this.imageData$ = combineLatest(this.rawImageData$, this.normalizedImageData$).pipe(
      map(([rawImageData, normalizedImageData]) => {
        return rawImageData || normalizedImageData;
      })
    );

    this.config$ = this.store.select(WorkbenchState.getPlottingPanelConfig);

    this.state$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getPlottingPanelStateByViewerId(viewerId)))
    );

    this.dataSource$ = combineLatest(this.rawImageData$, this.normalizedImageData$, this.config$).pipe(
      map(([rawImageData, normalizedImageData, config]) => {
        //TODO allow user to switch between raw and normalized values when both are available
        return rawImageData ? 'raw' : 'normalized';
      })
    );

    this.colorMode$ = this.dataSource$.pipe(map((dataSource) => (dataSource == 'raw' ? 'grayscale' : 'rgba')));

    this.lineStart$ = combineLatest(this.header$, this.state$).pipe(
      map(([header, state]) => {
        if (!state || !state.lineMeasureStart) return null;
        return this.normalizeLine(header, state.lineMeasureStart);
      })
    );

    this.lineEnd$ = combineLatest(this.header$, this.state$).pipe(
      map(([header, state]) => {
        if (!state || !state.lineMeasureEnd) return null;

        return this.normalizeLine(header, state.lineMeasureEnd);
      })
    );

    this.vectorInfo$ = combineLatest(this.lineStart$, this.lineEnd$, this.header$).pipe(
      map(([lineStart, lineEnd, header]) => {
        let pixelSeparation = null;
        let skySeparation = null;
        let pixelPosAngle = null;
        let skyPosAngle = null;

        if (!lineStart || !lineEnd) return null;

        if (lineStart.x !== null && lineStart.y !== null && lineEnd.x !== null && lineEnd.y !== null) {
          let deltaX = lineEnd.x - lineStart.x;
          let deltaY = lineEnd.y - lineStart.y;
          pixelPosAngle = (Math.atan2(deltaY, -deltaX) * 180.0) / Math.PI - 90;
          pixelPosAngle = pixelPosAngle % 360;
          if (pixelPosAngle < 0) pixelPosAngle += 360;
          pixelSeparation = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

          if (header && header.loaded) {
            let degsPerPixel =
              header.wcs && header.wcs.isValid() ? header.wcs.getPixelScale() : getDegsPerPixel(header);
            if (degsPerPixel) {
              skySeparation = pixelSeparation * degsPerPixel * 3600;
            }
          }
        }

        if (
          lineStart.raHours !== null &&
          lineStart.decDegs !== null &&
          lineEnd.raHours !== null &&
          lineEnd.decDegs !== null
        ) {
          let centerDec = (lineStart.decDegs + lineEnd.decDegs) / 2;
          let deltaRa = (lineEnd.raHours - lineStart.raHours) * 15 * 3600 * Math.cos((centerDec * Math.PI) / 180);
          let deltaDec = (lineEnd.decDegs - lineStart.decDegs) * 3600;
          skyPosAngle = (Math.atan2(deltaDec, -deltaRa) * 180.0) / Math.PI - 90;
          skyPosAngle = skyPosAngle % 360;
          if (skyPosAngle < 0) skyPosAngle += 360;
          skySeparation = Math.sqrt(Math.pow(deltaRa, 2) + Math.pow(deltaDec, 2));
        }

        return {
          pixelSeparation: pixelSeparation,
          skySeparation: skySeparation,
          pixelPosAngle: pixelPosAngle,
          skyPosAngle: skyPosAngle,
        };
      })
    );

    this.eventService.imageClickEvent$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.state$, this.config$, this.header$, this.imageData$))
      .subscribe(([$event, state, config, header, imageData]) => {
        if (!$event || !imageData) {
          return;
        }
        if ($event.viewerId != this.viewerId) return;

        if ($event.hitImage) {
          let x = $event.imageX;
          let y = $event.imageY;
          if (config && config.centroidClicks) {
            let result;
            if (config.planetCentroiding) {
              result = centroidDisk(imageData, x, y);
            } else {
              result = centroidPsf(imageData, x, y);
            }

            x = result.x;
            y = result.y;
          }

          let primaryCoord = x;
          let secondaryCoord = y;
          let posType = PosType.PIXEL;
          if (header?.wcs?.isValid()) {
            let wcs = header.wcs;
            let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
            primaryCoord = raDec[0];
            secondaryCoord = raDec[1];
            posType = PosType.SKY;
          }

          this.store.dispatch(
            new StartLine(state.id, {
              primaryCoord: primaryCoord,
              secondaryCoord: secondaryCoord,
              posType: posType,
            })
          );
        }
      });

    this.eventService.mouseMoveEvent$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.config$))
      .subscribe(([$event, config]) => {
        if (!$event) {
          return;
        }

        //allow events from different viewers
        let header = null;
        let state = this.store.selectSnapshot(WorkbenchState.getPlottingPanelStateByViewerId($event.viewerId));
        if (!state) {
          return;
        }
        if ($event.viewer.hduId) {
          header = this.store.selectSnapshot(DataFilesState.getHeaderByHduId($event.viewer.hduId));
        }

        let measuring = state.measuring;
        if (measuring) {
          let primaryCoord = $event.imageX;
          let secondaryCoord = $event.imageY;
          let posType = PosType.PIXEL;
          if (header?.wcs?.isValid()) {
            let wcs = header.wcs;
            let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
            primaryCoord = raDec[0];
            secondaryCoord = raDec[1];
            posType = PosType.SKY;
          }
          this.store.dispatch(
            new UpdateLine(state.id, {
              primaryCoord: primaryCoord,
              secondaryCoord: secondaryCoord,
              posType: posType,
            })
          );
        }
      });
  }

  ngOnInit() {
    let visibleViewerIds$: Observable<string[]> = this.store.select(WorkbenchState.getVisibleViewerIds).pipe(
      distinctUntilChanged((x, y) => {
        return x.length == y.length && x.every((value, index) => value == y[index]);
      })
    );

    visibleViewerIds$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((viewerIds) => {
          return merge(...viewerIds.map((viewerId) => this.getViewerMarkers(viewerId))).pipe(takeUntil(this.destroy$));
        })
      )
      .subscribe((v) => {
        this.markerService.updateMarkers(v.viewerId, v.markers);
      });
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.markerService.clearMarkers();
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  private normalizeLine(header: Header, line: { primaryCoord: number; secondaryCoord: number; posType: PosType }) {
    let x = null;
    let y = null;
    let raHours = null;
    let decDegs = null;
    if (line.posType == PosType.PIXEL) {
      x = line.primaryCoord;
      y = line.secondaryCoord;
      if (header?.wcs?.isValid()) {
        let raDec = header.wcs.pixToWorld([line.primaryCoord, line.secondaryCoord]);
        raHours = raDec[0];
        decDegs = raDec[1];
      }
    } else {
      raHours = line.primaryCoord;
      decDegs = line.secondaryCoord;
      if (header?.wcs?.isValid()) {
        let xy = header.wcs.worldToPix([line.primaryCoord, line.secondaryCoord]);
        x = xy[0];
        y = xy[1];
      }
    }
    return { x: x, y: y, raHours: raHours, decDegs: decDegs };
  }

  private getViewerMarkers(viewerId: string) {
    let state$ = this.store.select(WorkbenchState.getPlottingPanelStateByViewerId(viewerId));
    let config$ = this.store.select(WorkbenchState.getPlottingPanelConfig);
    let hduHeader$ = this.store.select(WorkbenchState.getHduHeaderByViewerId(viewerId));
    let fileImageHeader$ = this.store.select(WorkbenchState.getFileImageHeaderByViewerId(viewerId));
    let header$ = combineLatest(hduHeader$, fileImageHeader$).pipe(
      map(([hduHeader, fileHeader]) => hduHeader || fileHeader)
    );

    let markers$ = combineLatest(config$, state$, header$).pipe(
      map(([config, state, header]) => {
        if (!config || !state || !header) {
          return [];
        }

        let lineMeasureStart = state.lineMeasureStart;
        let lineMeasureEnd = state.lineMeasureEnd;
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
            id: `PLOTTING_MARKER`,
            type: MarkerType.LINE,
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
          };

          markers = [lineMarker];
        } else {
          let rectangleMarker: RectangleMarker = {
            id: `PLOTTING_MARKER`,
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

    return markers$.pipe(
      map((markers) => {
        return {
          viewerId: viewerId,
          markers: markers,
        };
      })
    );
  }

  onModeChange(mode: '1D' | '2D' | '3D') {
    this.store.dispatch(new UpdatePlottingPanelConfig({ plotMode: mode }));
  }

  onPlotterSyncEnabledChange($event: MatSlideToggleChange) {
    this.store.dispatch(new UpdatePlottingPanelConfig({ plotterSyncEnabled: $event.checked }));
  }

  onCentroidClicksChange($event: MatSlideToggleChange) {
    this.store.dispatch(new UpdatePlottingPanelConfig({ centroidClicks: $event.checked }));
  }

  onPlanetCentroidingChange($event: MatSlideToggleChange) {
    this.store.dispatch(new UpdatePlottingPanelConfig({ planetCentroiding: $event.checked }));
  }

  onInterpolatePixelsChange($event: MatSlideToggleChange) {
    this.store.dispatch(new UpdatePlottingPanelConfig({ interpolatePixels: $event.checked }));
  }
}
