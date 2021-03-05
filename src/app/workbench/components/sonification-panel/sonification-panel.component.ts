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
// import { Hotkey, HotkeysService } from "angular2-hotkeys";
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { Store, Actions } from '@ngxs/store';
import {
  AddRegionToHistory,
  UndoRegionSelection,
  RedoRegionSelection,
  UpdateSonifierFileState,
  SetProgressLine,
  Sonify,
  ClearSonification,
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

@Component({
  selector: 'app-sonification-panel',
  templateUrl: './sonification-panel.component.html',
  styleUrls: ['./sonification-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SonificationPanelComponent
  implements AfterViewInit, OnDestroy, OnChanges, OnInit {
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
  sonificationUri$: Observable<string>;
  sonificationUri: string = null;
  sonificationSrcUri: string = null;
  loading$: Observable<boolean>;
  playerLoading: boolean = false;
  showPlayer: boolean = false;

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
    // private _hotkeysService: HotkeysService,
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
      tap((region) => this.store.dispatch(new ClearSonification(this.hdu.id)))
    );

    this.loading$ = this.state$.pipe(
      map((state) => state.sonificationJobProgress != null),
      distinctUntilChanged()
    );

    this.sonificationUri$ = this.state$.pipe(
      map((state) => state?.sonificationUri),
      distinctUntilChanged()
    );

    this.sonificationUri$.pipe(takeUntil(this.destroy$)).subscribe((url) => {
      if (url) {
        this.store.dispatch(new SetProgressLine(this.hdu.id, null))
        this.stop();
        this.playStream(url);
      }
    });




    // this.hotKeys.push(
    //   new Hotkey(
    //     "1",
    //     (event: KeyboardEvent): boolean => {
    //       if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
    //       this.selectSubregionByTime(0);
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Time Navigation: Early"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "2",
    //     (event: KeyboardEvent): boolean => {
    //       if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
    //       this.selectSubregionByTime(1);
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Time Navigation: Mid"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "3",
    //     (event: KeyboardEvent): boolean => {
    //       if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
    //       this.selectSubregionByTime(2);
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Time Navigation: Late"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "4",
    //     (event: KeyboardEvent): boolean => {
    //       if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
    //       this.selectSubregionByFrequency(0);
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Frequency Navigation: Low"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "5",
    //     (event: KeyboardEvent): boolean => {
    //       if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
    //       this.selectSubregionByFrequency(1);
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Frequency Navigation: Mid"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "6",
    //     (event: KeyboardEvent): boolean => {
    //       if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
    //       this.selectSubregionByFrequency(2);
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Frequency Navigation: High"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "7",
    //     (event: KeyboardEvent): boolean => {
    //       if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
    //       this.selectSubregion(0, 0);
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Time Navigation: Early, Frequency Navigation Low"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "8",
    //     (event: KeyboardEvent): boolean => {
    //       if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
    //       this.selectSubregion(1, 1);
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Time Navigation: Mid, Frequency Navigation Mid"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "9",
    //     (event: KeyboardEvent): boolean => {
    //       if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
    //       this.selectSubregion(2, 2);
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Time Navigation: Late, Frequency Navigation High"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     ".",
    //     (event: KeyboardEvent): boolean => {
    //       this.sonify();
    //       this.ref.markForCheck();
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Play Sonification"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "enter",
    //     (event: KeyboardEvent): boolean => {
    //       if(document.activeElement.tagName == "BUTTON") return null;
    //       this.sonify();
    //       this.ref.markForCheck();
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Play Sonification"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "space",
    //     (event: KeyboardEvent): boolean => {
    //       if(document.activeElement.tagName == "BUTTON") return null;
    //       this.sonify();
    //       this.ref.markForCheck();
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Play Sonification"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "0",
    //     (event: KeyboardEvent): boolean => {
    //       if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
    //       this.resetRegionSelection();
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Reset Sonification Region"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "ctrl+z",
    //     (event: KeyboardEvent): boolean => {
    //       this.undoRegionSelection();
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Undo Sonification Region"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "ctrl+y",
    //     (event: KeyboardEvent): boolean => {
    //       this.redoRegionSelection();
    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Redo Sonification Region"
    //   )
    // );

    // this.hotKeys.forEach((hotKey) => this._hotkeysService.add(hotKey));
  }

  ngOnInit() {}

  ngAfterViewInit() {}

  ngOnDestroy() {
    // this.hotKeys.forEach((hotKey) => this._hotkeysService.remove(hotKey));
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
      takeUntil(this.stop$),
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

    // if (!this.sonificationUri) return;
    // if (
    //   this.sonificationSrcUri == this.sonificationUri &&
    //   this.api &&
    //   this.api.canPlay
    // ) {
    //   this.api.getDefaultMedia().play();
    // } else {
    //   this.sonificationSrcUri = this.sonificationUri;
    // }
  }

  // onPlayerReady(api: VgAPI) {
  //   this.api = api;

  //   let stop$ = from(this.api.getDefaultMedia().subscriptions.ended);
  //   let start$ = from(this.api.getDefaultMedia().subscriptions.playing);

  //   this.subs.push(
  //     from(this.api.getDefaultMedia().subscriptions.canPlayThrough).subscribe((canPlayThrough) => {
  //       this.playerLoading = false;
  //     })
  //   );

  //   this.subs.push(
  //     from(this.api.getDefaultMedia().subscriptions.loadStart).subscribe((canPlayThrough) => {
  //       this.playerLoading = true;
  //     })
  //   );

  //   let indexToneDuration = 0.852 / 2.0;
  //   this.progressLine$ = merge(
  //     start$.pipe(
  //       flatMap(() => interval(10).pipe(takeUntil(merge(stop$, this.sonificationUri$.pipe(skip(1)))))),
  //       withLatestFrom(this.region$),
  //       map(([v, region]) => {
  //         if (!this.api.getDefaultMedia()) return null;
  //         if (!this.api.getDefaultMedia().duration) return null;
  //         if (!region) return null;
  //         // console.log(region, this.api.getDefaultMedia().currentTime, indexToneDuration, this.api.getDefaultMedia().duration);
  //         let y =
  //           region.y +
  //           Math.max(
  //             0,
  //             Math.min(
  //               1,
  //               (this.api.getDefaultMedia().currentTime - indexToneDuration) /
  //                 (this.api.getDefaultMedia().duration - 2 * indexToneDuration)
  //             )
  //           ) *
  //             region.height;

  //         return { x1: region.x, y1: y, x2: region.x + region.width, y2: y };
  //       })
  //     ),
  //     stop$.pipe(map(() => null)),
  //     this.sonificationUri$.pipe(
  //       skip(1),
  //       map(() => null)
  //     )
  //   );

  //   this.subs.push(
  //     this.progressLine$.pipe(distinctUntilChanged()).subscribe((line) => {
  //       this.store.dispatch(new SetProgressLine(this.hdu.id, line));
  //     })
  //   );
  // }
}
