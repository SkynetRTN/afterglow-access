import {
  Component,
  AfterViewInit,
  ViewChild,
  OnDestroy,
  OnChanges,
  OnInit,
  HostBinding,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';

// import { VgAPI } from "videogular2/compiled/core";
import { Observable, Subscription, from, merge, interval, combineLatest, BehaviorSubject, Subject, of } from 'rxjs';
import {
  filter,
  map,
  flatMap,
  takeUntil,
  distinctUntilChanged,
  withLatestFrom,
  tap,
  skip,
  take,
  shareReplay,
  share,
  switchMap,
} from 'rxjs/operators';

import { getWidth, getHeight, DataFile, ImageLayer, ILayer } from '../../../../data-files/models/data-file';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { Store, Actions, ofActionDispatched } from '@ngxs/store';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { Region } from '../../../../data-files/models/region';
import { getViewportRegion, Transform, getImageToViewportTransform } from '../../../../data-files/models/transformation';
import * as moment from 'moment';
import { ShortcutInput } from 'ng-keyboard-shortcuts';
import { LayerType } from '../../../../data-files/models/data-file-type';
import { WorkbenchState } from '../../../workbench.state';
import { isNotEmpty } from '../../../../utils/utils';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { ImageViewerMarkerService } from '../../../services/image-viewer-marker.service';
import { LineMarker, Marker, MarkerType, RectangleMarker } from '../../../models/marker';
import { SonificationState, SonificationViewerStateModel } from '../sonification.state';
import { AddRegionToHistory, RedoRegionSelection, SetProgressLine, SonificationCompleted, Sonify, UndoRegionSelection, UpdateSonifierFileState } from '../sonification.actions';
import { SonifierRegionMode } from '../models/sonifier-file-state';

@Component({
  selector: 'app-sonification-panel',
  templateUrl: './sonification-panel.component.html',
  styleUrls: ['./sonification-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SonificationPanelComponent implements AfterViewInit, OnDestroy, OnInit {
  @Input('viewerId')
  set viewerId(viewer: string) {
    this.viewerId$.next(viewer);
  }
  get viewerId() {
    return this.viewerId$.getValue();
  }
  protected viewerId$ = new BehaviorSubject<string>(null);

  destroy$ = new Subject<boolean>();

  viewportSize$: Observable<{ width: number; height: number }>;
  file$: Observable<DataFile>;
  layer$: Observable<ILayer>;
  imageLayer$: Observable<ImageLayer>;
  imageLayer: ImageLayer;
  state$: Observable<SonificationViewerStateModel>;
  state: SonificationViewerStateModel;
  imageToViewportTransform$: Observable<Transform>;
  region$: Observable<Region>;
  region: Region;
  shortcuts: ShortcutInput[] = [];
  stop$ = new Subject();
  audioObj = new Audio();
  audioEvents = ['ended', 'error', 'play', 'playing', 'pause', 'timeupdate', 'canplay', 'loadedmetadata', 'loadstart'];
  progressLine$: Observable<{ x1: number; y1: number; x2: number; y2: number }>;

  SonifierRegionMode = SonifierRegionMode;

  constructor(private actions$: Actions, private store: Store, private markerService: ImageViewerMarkerService) {
    this.viewportSize$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getViewportSizeByViewerId(viewerId)))
    );

    this.file$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getFileByViewerId(viewerId)))
    );

    this.layer$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getLayerByViewerId(viewerId)))
    );

    this.imageLayer$ = this.layer$.pipe(map((layer) => (layer && layer.type == LayerType.IMAGE ? (layer as ImageLayer) : null)));
    this.imageLayer$.pipe(takeUntil(this.destroy$)).subscribe((imageLayer) => (this.imageLayer = imageLayer));

    this.state$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(SonificationState.getSonificationViewerStateByViewerId(viewerId)))
    );

    this.state$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      this.state = state;
    });

    this.imageToViewportTransform$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getLayerImageToViewportTransformByViewerId(viewerId)))
    );

    this.region$ = combineLatest(this.imageLayer$, this.imageToViewportTransform$, this.viewportSize$, this.state$).pipe(
      filter(([layer, transform, viewportSize, state]) => isNotEmpty(state) && isNotEmpty(layer)),
      map(([layer, transform, viewportSize, state]) => {
        if (state.regionMode == SonifierRegionMode.CUSTOM) {
          this.region = state.regionHistory[state.regionHistoryIndex];
        } else if (!layer || !transform || !viewportSize) {
          this.region = null;
        } else {
          let rawImageData = this.store.selectSnapshot(DataFilesState.getImageDataEntities)[layer.rawImageDataId];
          this.region = getViewportRegion(
            transform,
            rawImageData.width,
            rawImageData.height,
            viewportSize.width,
            viewportSize.height
          );
        }

        return this.region;
      }),
      distinctUntilChanged((a, b) => a && b && a.x == b.x && a.y == b.y && a.width == b.width && a.height == b.height)
    );

    this.region$.pipe(takeUntil(this.destroy$), withLatestFrom(this.imageLayer$)).subscribe(([region, layer]) => {
      if (!layer) return;

      this.stop();
      this.store.dispatch(new SetProgressLine(layer.id, null));
    });

    this.actions$
      .pipe(ofActionDispatched(SonificationCompleted), takeUntil(this.destroy$), withLatestFrom(this.imageLayer$))
      .subscribe(([action, layer]) => {
        let a = action as SonificationCompleted;
        if (!a.error && a.url) {
          this.store.dispatch(new SetProgressLine(layer.id, null));
          this.stop();
          this.playStream(a.url);
        }
      });
  }

  ngOnInit() {
    /** markers */
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

  ngAfterViewInit() {
    this.shortcuts.push({
      key: '1',
      label: 'Select low frequency region from beginning of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(0, 0);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '2',
      label: 'Select mid frequency region from beginning of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(0, 1);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '3',
      label: 'Select high frequency region from beginning of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(0, 2);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '4',
      label: 'Select low frequency region from middle of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(1, 0);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '5',
      label: 'Select mid frequency region from middle of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(1, 1);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '6',
      label: 'Select high frequency region from middle of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(1, 2);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '7',
      label: 'Select low frequency region from end of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(2, 0);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '8',
      label: 'Select mid frequency region from end of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(2, 1);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '9',
      label: 'Select high frequency region from end of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(2, 2);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'left',
      label: 'Select low frequency region from sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregionByFrequency(0);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'right',
      label: 'Select high frequency region from sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregionByFrequency(2);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: ['left right', 'right left'],
      label: 'Select central frequency region from sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregionByFrequency(1);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'down',
      label: 'Select region from beginning of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregionByTime(0);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'up',
      label: 'Select region from end of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregionByTime(2);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: ['up down', 'down up'],
      label: 'Select region from middle of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregionByTime(1);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'ctrl + z',
      label: 'Undo previous region selection',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.undoRegionSelection();
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'ctrl + y',
      label: 'Redo previous region selection',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.redoRegionSelection();
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'c',
      label: 'Custom region mode',
      command: (e) => {
        if (this.state.regionMode == SonifierRegionMode.CUSTOM) return;
        this.store.dispatch(
          new UpdateSonifierFileState(this.imageLayer.id, {
            regionMode: SonifierRegionMode.CUSTOM,
          })
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'v',
      label: 'Viewport region mode',
      command: (e) => {
        if (this.state.regionMode == SonifierRegionMode.VIEWPORT) return;
        this.store.dispatch(
          new UpdateSonifierFileState(this.imageLayer.id, {
            regionMode: SonifierRegionMode.VIEWPORT,
          })
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '0',
      label: 'Reset region selection',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.resetRegionSelection();
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: ['space', 'enter'],
      label: 'Sonifiy',
      command: (e) => {
        this.sonify();
      },
      preventDefault: true,
    });
  }

  ngOnDestroy() {
    this.markerService.clearMarkers();
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  private getViewerMarkers(viewerId: string) {
    let state$ = this.store.select(SonificationState.getSonificationViewerStateByViewerId(viewerId));
    return state$.pipe(
      map((state) => {
        if (!state) return { viewerId: viewerId, markers: [] as Marker[] };
        let region = state.regionHistory[state.regionHistoryIndex];
        let regionMode = state.regionMode;
        let progressLine = state.progressLine;
        let markers: Array<RectangleMarker | LineMarker> = [];
        if (region && regionMode == SonifierRegionMode.CUSTOM)
          markers.push({
            id: `SONIFICATION_REGION`,
            type: MarkerType.RECTANGLE,
            ...region,
          } as RectangleMarker);
        if (progressLine)
          markers.push({
            id: `SONIFICATION_PROGRESS`,
            type: MarkerType.LINE,
            ...progressLine,
          } as LineMarker);

        return {
          viewerId: viewerId,
          markers: markers,
        };
      })
    );
  }

  getStream(url: string): Observable<Event> {
    return new Observable((observer) => {
      // Play audio
      this.audioObj.src = url;
      this.audioObj.load();
      this.audioObj.play();

      const handler = (event: Event) => {
        observer.next(event);
      };

      this.addEvents(this.audioObj, this.audioEvents, handler);
      return () => {
        // Stop Playing
        this.audioObj.pause();
        this.audioObj.currentTime = 0;
        // remove event listeners
        this.removeEvents(this.audioObj, this.audioEvents, handler);
      };
    });
  }

  playStream(url: string) {
    let indexToneDuration = 0.852 / 2.0;

    let events$ = this.getStream(url).pipe(takeUntil(merge(this.destroy$, this.stop$)), share());

    let stopUpdating$ = merge(
      this.destroy$,
      this.stop$,
      events$.pipe(filter((event) => event.type == 'ended' || event.type == 'pause' || event.type == 'error'))
    ).pipe(
      take(1),
      withLatestFrom(this.imageLayer$),
      tap(([value, layer]) => {
        this.store.dispatch(new SetProgressLine(layer.id, null));
      })
    );

    events$
      .pipe(
        filter((event) => event.type == 'play'),
        withLatestFrom(this.region$),
        flatMap(([event, region]) => {
          return interval(10).pipe(
            takeUntil(stopUpdating$),
            map(() => {
              if (!region || !this.audioObj.duration || !this.audioObj.currentTime) {
                return null;
              }
              let y =
                region.y +
                Math.max(
                  0,
                  Math.min(
                    1,
                    (this.audioObj.currentTime - indexToneDuration) / (this.audioObj.duration - 2 * indexToneDuration)
                  )
                ) *
                region.height;

              return {
                x1: region.x,
                y1: y,
                x2: region.x + region.width,
                y2: y,
              };
            })
          );
        }),

        withLatestFrom(this.imageLayer$)
      )
      .subscribe(([line, layer]) => {
        this.store.dispatch(new SetProgressLine(layer.id, line));
      });
  }

  openFile(url: string) { }

  play() {
    this.audioObj.play();
  }

  pause() {
    this.audioObj.pause();
  }

  stop() {
    this.stop$.next();
  }

  seekTo(seconds) {
    this.audioObj.currentTime = seconds;
  }

  formatTime(time: number, format: string = 'HH:mm:ss') {
    const momentTime = time * 1000;
    return moment.utc(momentTime).format(format);
  }

  private addEvents(obj, events, handler) {
    events.forEach((event) => {
      obj.addEventListener(event, handler);
    });
  }

  private removeEvents(obj, events, handler) {
    events.forEach((event) => {
      obj.removeEventListener(event, handler);
    });
  }

  selectSubregionByFrequency(subregion: number) {
    this.selectSubregion(null, subregion);
  }

  selectSubregionByTime(subregion: number) {
    this.selectSubregion(subregion, null);
  }

  selectSubregion(timeSubregion: number = null, frequencySubregion: number = null) {
    if (!this.imageLayer) return;

    let region = this.state.regionHistory[this.state.regionHistoryIndex];
    let xShift = 0;
    let width = region.width;
    let yShift = 0;
    let height = region.height;
    if (frequencySubregion !== null) {
      xShift = frequencySubregion * (region.width / 4);
      width /= 2;
    }
    if (timeSubregion !== null) {
      yShift = timeSubregion * (region.height / 4);
      height /= 2;
    }
    this.store.dispatch(
      new AddRegionToHistory(this.imageLayer.id, {
        x: region.x + xShift,
        y: region.y + yShift,
        width: width,
        height: height,
      })
    );
  }

  resetRegionSelection() {
    if (!this.imageLayer) return;
    // let region = this.lastSonifierStateConfig.region;
    // this.store.dispatch(new workbenchActions.ClearSonifierRegionHistory({file: this.lastImageFile}));
    let header = this.store.selectSnapshot(DataFilesState.getHeaderById(this.imageLayer.headerId));
    if (!header) return;

    this.store.dispatch(
      new AddRegionToHistory(this.imageLayer.id, {
        x: 0.5,
        y: 0.5,
        width: getWidth(header),
        height: getHeight(header),
      })
    );
  }

  undoRegionSelection() {
    if (!this.imageLayer) return;

    this.store.dispatch(new UndoRegionSelection(this.imageLayer.id));
  }

  redoRegionSelection() {
    if (!this.imageLayer) return;

    this.store.dispatch(new RedoRegionSelection(this.imageLayer.id));
  }

  setRegionMode($event: MatButtonToggleChange) {
    if (!this.imageLayer) return;

    this.store.dispatch(
      new UpdateSonifierFileState(this.imageLayer.id, {
        regionMode: $event.value,
      })
    );
  }

  setDuration(value: number) {
    if (!this.imageLayer) return;

    let layer = this.store.selectSnapshot(DataFilesState.getLayerById(this.imageLayer.id));
    this.store.dispatch(new UpdateSonifierFileState(this.imageLayer.id, { duration: value }));
  }

  setToneCount(value: number) {
    if (!this.imageLayer) return;

    this.store.dispatch(new UpdateSonifierFileState(this.imageLayer.id, { toneCount: value }));
  }

  setViewportSync(value: MatSlideToggleChange) {
    if (!this.imageLayer) return;

    this.store.dispatch(
      new UpdateSonifierFileState(this.imageLayer.id, {
        viewportSync: value.checked,
      })
    );
  }

  sonify() {
    if (!this.imageLayer || !this.region) return;

    this.store.dispatch(new Sonify(this.imageLayer.id, this.region));
  }
}
