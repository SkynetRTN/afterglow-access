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
import {
  Observable,
  Subscription,
  from,
  merge,
  interval,
  combineLatest,
  BehaviorSubject,
  Subject,
} from 'rxjs';
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

import {
  SonifierRegionMode,
  SonificationPanelState,
} from '../../models/sonifier-file-state';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import {
  getWidth,
  getHeight,
  DataFile,
  ImageHdu,
} from '../../../data-files/models/data-file';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { Store, Actions, ofActionDispatched } from '@ngxs/store';
import {
  AddRegionToHistory,
  UndoRegionSelection,
  RedoRegionSelection,
  UpdateSonifierFileState,
  SetProgressLine,
  Sonify,
  ClearSonification,
  SonificationCompleted,
} from '../../workbench.actions';
import { DataFilesState } from '../../../data-files/data-files.state';
import { Region } from '../../../data-files/models/region';
import {
  getViewportRegion,
  Transform,
  getImageToViewportTransform,
} from '../../../data-files/models/transformation';
import { MatCheckboxChange } from '@angular/material/checkbox';
import * as moment from 'moment';
import { ShortcutInput } from 'ng-keyboard-shortcuts';
import { HduType } from '../../../data-files/models/data-file-type';
import { Viewer } from '../../models/viewer';
import { WorkbenchState } from '../../workbench.state';
import { WorkbenchImageHduState } from '../../models/workbench-file-state';

@Component({
  selector: 'app-sonification-panel',
  templateUrl: './sonification-panel.component.html',
  styleUrls: ['./sonification-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SonificationPanelComponent
  implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  //viewer is currently needed to determine the source extraction region
  @Input('viewer')
  set viewer(viewer: Viewer) {
    this.viewer$.next(viewer);
  }
  get viewer() {
    return this.viewer$.getValue();
  }
  private viewer$ = new BehaviorSubject<Viewer>(null);

  destroy$: Subject<boolean> = new Subject<boolean>();
  SonifierRegionMode = SonifierRegionMode;
  file$: Observable<DataFile>;
  hdu$: Observable<ImageHdu>;
  state$: Observable<SonificationPanelState>;
  state: SonificationPanelState;
  viewportTransform$: Observable<Transform>;
  imageTransform$: Observable<Transform>;
  viewportSize$: Observable<{ width: number; height: number }>;

  region$: Observable<Region>;
  region: Region;
  shortcuts: ShortcutInput[] = [];
  HduType = HduType;
  stop$ = new Subject();
  audioObj = new Audio();
  audioEvents = [
    'ended',
    'error',
    'play',
    'playing',
    'pause',
    'timeupdate',
    'canplay',
    'loadedmetadata',
    'loadstart',
  ];

  subs: Subscription[] = [];
  progressLine$: Observable<{ x1: number; y1: number; x2: number; y2: number }>;

  constructor(
    private afterglowService: AfterglowDataFileService,
    private ref: ChangeDetectorRef,
    private afterglowDataFileService: AfterglowDataFileService,
    private actions$: Actions,
    private store: Store,
    private router: Router
  ) {
    this.viewportSize$ = this.viewer$.pipe(
      map((viewer) => viewer?.viewportSize)
    );

    this.file$ = this.viewer$.pipe(
      map((viewer) => viewer?.fileId),
      distinctUntilChanged(),
      switchMap((fileId) =>
        this.store
          .select(DataFilesState.getFileById)
          .pipe(map((fn) => fn(fileId)))
      )
    );

    let hduId$ = this.viewer$.pipe(
      map((viewer) => viewer?.hduId),
      distinctUntilChanged()
    );

    this.hdu$ = hduId$.pipe(
      switchMap((hduId) =>
        this.store.select(DataFilesState.getHduById).pipe(
          map((fn) => {
            let hdu = fn(hduId);
            if (hdu.hduType != HduType.IMAGE) return null;
            return hdu as ImageHdu;
          })
        )
      )
    );

    let hduState$ = hduId$.pipe(
      switchMap(hduId => this.store.select(WorkbenchState.getHduStateById).pipe(
        map(fn => fn(hduId))
      ))
    )
    this.state$ = hduState$.pipe(
      map(hduState =>  {
        if(hduState && hduState.hduType != HduType.IMAGE) {
          // only image HDUs support sonification
          return null;
        }
        return (hduState as WorkbenchImageHduState)?.sonificationPanelStateId
      }),
      distinctUntilChanged(),
      switchMap(id => this.store.select(WorkbenchState.getSonificationPanelStateById).pipe(
        map(fn => fn(id))
      ))
    )

    this.state$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(state => {
      this.state = state;
    })
   

    this.viewportTransform$ = this.hdu$.pipe(
      switchMap((hdu) =>
        this.store
          .select(DataFilesState.getTransformById)
          .pipe(map((fn) => fn(hdu?.viewportTransformId)))
      )
    );

    this.imageTransform$ = this.hdu$.pipe(
      switchMap((hdu) =>
        this.store
          .select(DataFilesState.getTransformById)
          .pipe(map((fn) => fn(hdu?.imageTransformId)))
      )
    );

    let imageToViewportTransform$ = combineLatest(
      this.viewportTransform$,
      this.imageTransform$
    ).pipe(
      map(([viewportTransform, imageTransform]) => {
        if (!viewportTransform || !imageTransform) {
          return null;
        }
        return getImageToViewportTransform(viewportTransform, imageTransform);
      })
    );
    this.region$ = combineLatest(
      this.hdu$,
      imageToViewportTransform$,
      this.viewportSize$,
      this.state$
    ).pipe(
      filter(
        ([hdu, transform, viewportSize, state]) =>
          state !== null && hdu !== null
      ),
      map(([hdu, transform, viewportSize, state]) => {
        if (state.regionMode == SonifierRegionMode.CUSTOM) {
          this.region = state.regionHistory[state.regionHistoryIndex];
        } else if (!hdu || !transform || !viewportSize) {
          this.region = null;
        } else {
          let rawImageData = this.store.selectSnapshot(
            DataFilesState.getImageDataEntities
          )[hdu.rawImageDataId];
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
      distinctUntilChanged(
        (a, b) =>
          a &&
          b &&
          a.x == b.x &&
          a.y == b.y &&
          a.width == b.width &&
          a.height == b.height
      )
    );

    this.region$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.hdu$))
      .subscribe(([region, hdu]) => {
        if (!hdu) return;

        this.stop();
        this.store.dispatch(new SetProgressLine(hdu.id, null));
      });

    this.actions$
      .pipe(
        ofActionDispatched(SonificationCompleted),
        takeUntil(this.destroy$),
        withLatestFrom(this.hdu$)
      )
      .subscribe(([action, hdu]) => {
        let a = action as SonificationCompleted;
        if (!a.error && a.url) {
          this.store.dispatch(new SetProgressLine(hdu.id, null));
          this.stop();
          this.playStream(a.url);
        }
      });
  }

  ngOnInit() {}

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
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  ngOnChanges() {}

  getStream(url: string): Observable<Event> {
    return new Observable((observer) => {
      // Play audio
      console.log('Observable Loaded!  ', url);
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

    let events$ = this.getStream(url).pipe(
      takeUntil(merge(this.destroy$, this.stop$)),
      share()
    );

    let stopUpdating$ = merge(
      this.stop$,
      events$.pipe(
        filter((event) => event.type == 'ended' || event.type == 'pause')
      )
    ).pipe(
      take(1),
      withLatestFrom(this.hdu$),
      tap(([value, hdu]) => {
        this.store.dispatch(new SetProgressLine(hdu.id, null));
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
              if (
                !region ||
                !this.audioObj.duration ||
                !this.audioObj.currentTime
              ) {
                return null;
              }
              let y =
                region.y +
                Math.max(
                  0,
                  Math.min(
                    1,
                    (this.audioObj.currentTime - indexToneDuration) /
                      (this.audioObj.duration - 2 * indexToneDuration)
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

        withLatestFrom(this.hdu$)
      )
      .subscribe(([line, hdu]) => {
        this.store.dispatch(new SetProgressLine(hdu.id, line));
      });
  }

  openFile(url: string) {}

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

  selectSubregion(
    timeSubregion: number = null,
    frequencySubregion: number = null
  ) {
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
      new AddRegionToHistory(this.viewer.hduId, {
        x: region.x + xShift,
        y: region.y + yShift,
        width: width,
        height: height,
      })
    );
  }

  resetRegionSelection() {
    // let region = this.lastSonifierStateConfig.region;
    // this.store.dispatch(new workbenchActions.ClearSonifierRegionHistory({file: this.lastImageFile}));
    let hdu = this.store.selectSnapshot(DataFilesState.getHduById)(this.viewer?.hduId);
    let header = this.store.selectSnapshot(DataFilesState.getHeaderById)(hdu.headerId);
    if(!hdu || !header) return ;

    this.store.dispatch(
      new AddRegionToHistory(hdu.id, {
        x: 0.5,
        y: 0.5,
        width: getWidth(header),
        height: getHeight(header),
      })
    );
  }

  undoRegionSelection() {
    this.store.dispatch(new UndoRegionSelection(this.viewer.hduId));
  }

  redoRegionSelection() {
    this.store.dispatch(new RedoRegionSelection(this.viewer.hduId));
  }

  setRegionMode($event: MatButtonToggleChange) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.viewer.hduId, {
        regionMode: $event.value,
      })
    );
  }

  setDuration(value: number) {
    let hdu = this.store.selectSnapshot(DataFilesState.getHduById)(this.viewer?.hduId);
    this.store.dispatch(
      new UpdateSonifierFileState(this.viewer.hduId, { duration: value })
    );
  }

  setToneCount(value: number) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.viewer.hduId, { toneCount: value })
    );
  }

  setViewportSync(value: MatCheckboxChange) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.viewer.hduId, {
        viewportSync: value.checked,
      })
    );
  }

  sonify() {
    if (!this.viewer.hduId || !this.region) return;
    this.store.dispatch(new Sonify(this.viewer.hduId, this.region));
  }
}
