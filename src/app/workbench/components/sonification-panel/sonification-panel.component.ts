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

@Component({
  selector: 'app-sonification-panel',
  templateUrl: './sonification-panel.component.html',
  styleUrls: ['./sonification-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SonificationPanelComponent
  implements AfterViewInit, OnDestroy, OnChanges, OnInit {
    @Input('file')
    set file(file: DataFile) {
      this.file$.next(file);
    }
    get file() {
      return this.file$.getValue();
    }
    private file$ = new BehaviorSubject<DataFile>(null);
  
    @Input('hdu')
    set hdu(hdu: ImageHdu) {
      this.hdu$.next(hdu);
    }
    get hdu() {
      return this.hdu$.getValue();
    }
    private hdu$ = new BehaviorSubject<ImageHdu>(null);

  @Input('imageTransform')
  set imageTransform(imageTransform: Transform) {
    this.imageTransform$.next(imageTransform);
  }
  get imageTransform() {
    return this.imageTransform$.getValue();
  }
  private imageTransform$ = new BehaviorSubject<Transform>(null);

  @Input('viewportTransform')
  set viewportTransform(viewportTransform: Transform) {
    this.viewportTransform$.next(viewportTransform);
  }
  get viewportTransform() {
    return this.viewportTransform$.getValue();
  }
  private viewportTransform$ = new BehaviorSubject<Transform>(null);

  @Input('viewportSize')
  set viewportSize(viewportSize: { width: number; height: number }) {
    this.viewportSize$.next(viewportSize);
  }
  get viewportSize() {
    return this.viewportSize$.getValue();
  }
  private viewportSize$ = new BehaviorSubject<{
    width: number;
    height: number;
  }>(null);

  @Input('state')
  set state(state: SonificationPanelState) {
    this.state$.next(state);
  }
  get state() {
    return this.state$.getValue();
  }
  private state$ = new BehaviorSubject<SonificationPanelState>(null);

  destroy$: Subject<boolean> = new Subject<boolean>();
  SonifierRegionMode = SonifierRegionMode;
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
      ),
      tap((region) => {
        this.stop();
        this.store.dispatch(new SetProgressLine(this.hdu.id, null))
      })
    );

    
    this.actions$.pipe(
      ofActionDispatched(SonificationCompleted),
      takeUntil(this.destroy$),
    ).subscribe((action => {
        let a = action as SonificationCompleted;
        if(!a.error && a.url) {
          this.store.dispatch(new SetProgressLine(this.hdu.id, null))
          this.stop();
          this.playStream(a.url);
        }
    }))
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.shortcuts.push({
      key: '1',
      label: 'Select low frequency region from beginning of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(0,0);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '2',
      label: 'Select mid frequency region from beginning of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(0,1);
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '3',
      label: 'Select high frequency region from beginning of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregion(0,2);
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
        this.selectSubregionByFrequency(0)
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'right',
      label: 'Select high frequency region from sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregionByFrequency(2)
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: ['left right', 'right left'],
      label: 'Select central frequency region from sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregionByFrequency(1)
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'down',
      label: 'Select region from beginning of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregionByTime(0)
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'up',
      label: 'Select region from end of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregionByTime(2)
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: ['up down', 'down up'],
      label: 'Select region from middle of sonification',
      command: (e) => {
        if (this.state.regionMode != SonifierRegionMode.CUSTOM) return;
        this.selectSubregionByTime(1)
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
      console.log("Observable Loaded!  ", url)
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
    )

    let stopUpdating$ = merge(
      this.stop$,
      events$.pipe(
        filter(event => event.type == 'ended' || event.type == 'pause')
      )
    ).pipe(
      take(1),
      tap(() => {
        this.store.dispatch(new SetProgressLine(this.hdu.id, null));
      })
    )

    
    events$.pipe(
      filter(event => event.type == 'play'),
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
                  (this.audioObj.currentTime - indexToneDuration) /
                    (this.audioObj.duration - 2 * indexToneDuration)
                )
              ) *
                region.height;
    
            return  {
              x1: region.x,
              y1: y,
              x2: region.x + region.width,
              y2: y,
            };
          })
        )
      })
    ).subscribe((line => {
      this.store.dispatch(new SetProgressLine(this.hdu.id, line));
    }));
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
      new AddRegionToHistory(this.hdu.id, {
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
    let header = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[
      this.hdu.headerId
    ];
    this.store.dispatch(
      new AddRegionToHistory(this.hdu.id, {
        x: 0.5,
        y: 0.5,
        width: getWidth(header),
        height: getHeight(header),
      })
    );
  }

  undoRegionSelection() {
    this.store.dispatch(new UndoRegionSelection(this.hdu.id));
  }

  redoRegionSelection() {
    this.store.dispatch(new RedoRegionSelection(this.hdu.id));
  }

  setRegionMode($event: MatButtonToggleChange) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.hdu.id, {
        regionMode: $event.value,
      })
    );
  }

  setDuration(value: number) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.hdu.id, { duration: value })
    );
  }

  setToneCount(value: number) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.hdu.id, { toneCount: value })
    );
  }

  setViewportSync(value: MatCheckboxChange) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.hdu.id, {
        viewportSync: value.checked,
      })
    );
  }

  sonify() {
    if (!this.hdu || !this.region) return;
    this.store.dispatch(new Sonify(this.hdu.id, this.region));
  }
}
