import {
  Component,
  AfterViewInit,
  ViewChild,
  OnDestroy,
  OnChanges,
  OnInit,
  HostBinding,
  Input,
} from "@angular/core";

import { VgAPI } from "videogular2/core";
import {
  Observable,
  Subscription,
  from,
  merge,
  interval,
  combineLatest,
  BehaviorSubject,
} from "rxjs";
import {
  filter,
  map,
  flatMap,
  takeUntil,
  distinctUntilChanged,
  withLatestFrom,
  tap,
} from "rxjs/operators";

import { SonifierRegionMode } from "../../models/sonifier-file-state";
import { AfterglowDataFileService } from "../../services/afterglow-data-files";
import {
  ImageFile,
  getWidth,
  getHeight,
} from "../../../data-files/models/data-file";
import {
  Hotkey,
  HotkeysService,
} from "angular2-hotkeys";
import { ChangeDetectorRef } from "@angular/core";
import { Router } from "@angular/router";
import { MatButtonToggleChange } from "@angular/material";
import { Store, Actions } from "@ngxs/store";
import {
  AddRegionToHistory,
  UndoRegionSelection,
  RedoRegionSelection,
  UpdateSonifierFileState,
  SetProgressLine,
} from "../../workbench-file-states.actions";
import { Region } from "../../models/region";
import {
  getViewportRegion,
  Transformation,
} from "../../models/transformation";

export interface SonificationToolsetState {
  file: ImageFile;
  transformation: Transformation;
  sonificationUri: string;
  regionHistoryInitialized: boolean;
  regionHistory: Array<Region>;
  regionHistoryIndex: number | null;
  regionMode: SonifierRegionMode;
  viewportSync: boolean;
  duration: number;
  toneCount: number;
  progressLine: { x1: number; y1: number; x2: number; y2: number };
}

@Component({
  selector: "app-sonification-toolset",
  templateUrl: "./sonification-toolset.component.html",
  styleUrls: ["./sonification-toolset.component.css"],
})
export class SonifierPageComponent
  implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  @Input("state")
  set state(state: SonificationToolsetState) {
    this.state$.next(state);
  }
  get state() {
    return this.state$.getValue();
  }
  private state$ = new BehaviorSubject<SonificationToolsetState>(null);

  SonifierRegionMode = SonifierRegionMode;
  region$: Observable<Region>;
  sonificationUri$: Observable<string>;
  sonificationUri: string = null;
  sonificationSrcUri: string = null;
  clearProgressLine$: Observable<boolean>;
  loading: boolean = false;
  showPlayer: boolean = false;
  api: VgAPI;
  viewportSize: { width: number; height: number } = null;
  hotKeys: Array<Hotkey> = [];
  subs: Subscription[] = [];
  progressLine$: Observable<{ x1: number; y1: number; x2: number; y2: number }>;

  constructor(
    private afterglowService: AfterglowDataFileService,
    private _hotkeysService: HotkeysService,
    private ref: ChangeDetectorRef,
    private afterglowDataFileService: AfterglowDataFileService,
    private actions$: Actions,
    private store: Store,
    private router: Router
  ) {
    this.region$ = this.state$.pipe(
      filter((state) => state !== null),
      map((state) => {
        if (state.regionMode == SonifierRegionMode.CUSTOM)
          return state.regionHistory[state.regionHistoryIndex];
        if (
          !state.file ||
          !state.file.headerLoaded ||
          !state.transformation ||
          !state.transformation.viewportSize ||
          !state.transformation.imageToViewportTransform
        )
          return null;
        return getViewportRegion(state.transformation, state.file);
      })
    );

    this.sonificationUri$ = combineLatest(this.region$, this.state$).pipe(
      map(([region, state]) => {
        if (!region) return null;
        this.sonificationUri = this.afterglowDataFileService.getSonificationUri(
          state.file.id,
          region,
          state.duration,
          state.toneCount
        );
        return this.sonificationUri;
      }),
      distinctUntilChanged()
    );

    this.clearProgressLine$ = this.sonificationUri$.pipe(
      filter((uri) => {
        return this.sonificationSrcUri != uri;
      }),
      map(() => true),
      tap(() => (this.sonificationSrcUri = null))
    );

    this.hotKeys.push(
      new Hotkey(
        "t 1",
        (event: KeyboardEvent): boolean => {
          if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
          this.selectSubregionByTime(0);
          return false; // Prevent bubbling
        },
        undefined,
        "Time Navigation: Early"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "t 2",
        (event: KeyboardEvent): boolean => {
          if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
          this.selectSubregionByTime(1);
          return false; // Prevent bubbling
        },
        undefined,
        "Time Navigation: Mid"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "t 3",
        (event: KeyboardEvent): boolean => {
          if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
          this.selectSubregionByTime(2);
          return false; // Prevent bubbling
        },
        undefined,
        "Time Navigation: Late"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "f 1",
        (event: KeyboardEvent): boolean => {
          if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
          this.selectSubregionByFrequency(0);
          return false; // Prevent bubbling
        },
        undefined,
        "Frequency Navigation: Low"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "f 2",
        (event: KeyboardEvent): boolean => {
          if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
          this.selectSubregionByFrequency(1);
          return false; // Prevent bubbling
        },
        undefined,
        "Frequency Navigation: Mid"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "f 3",
        (event: KeyboardEvent): boolean => {
          if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
          this.selectSubregionByFrequency(2);
          return false; // Prevent bubbling
        },
        undefined,
        "Frequency Navigation: High"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "enter",
        (event: KeyboardEvent): boolean => {
          this.sonify();
          this.ref.markForCheck();
          return false; // Prevent bubbling
        },
        undefined,
        "Play Sonification"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "space",
        (event: KeyboardEvent): boolean => {
          this.sonify();
          this.ref.markForCheck();
          return false; // Prevent bubbling
        },
        undefined,
        "Play Sonification"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "esc",
        (event: KeyboardEvent): boolean => {
          if (this.state.regionMode != SonifierRegionMode.CUSTOM) return true;
          this.resetRegionSelection();
          return false; // Prevent bubbling
        },
        undefined,
        "Reset Sonification Region"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "ctrl+z",
        (event: KeyboardEvent): boolean => {
          this.undoRegionSelection();
          return false; // Prevent bubbling
        },
        undefined,
        "Undo Sonification Region"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "ctrl+y",
        (event: KeyboardEvent): boolean => {
          this.redoRegionSelection();
          return false; // Prevent bubbling
        },
        undefined,
        "Redo Sonification Region"
      )
    );

    this.hotKeys.forEach((hotKey) => this._hotkeysService.add(hotKey));
  }

  ngOnInit() {}

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.hotKeys.forEach((hotKey) => this._hotkeysService.remove(hotKey));
  }

  ngOnChanges() {}

  private selectSubregionByFrequency(subregion: number) {
    let region = this.state.regionHistory[this.state.regionHistoryIndex];
    this.store.dispatch(
      new AddRegionToHistory(this.state.file.id, {
        x: region.x + subregion * (region.width / 4),
        y: region.y,
        width: region.width / 2,
        height: region.height,
      })
    );
  }

  private selectSubregionByTime(subregion: number) {
    let region = this.state.regionHistory[this.state.regionHistoryIndex];
    this.store.dispatch(
      new AddRegionToHistory(this.state.file.id, {
        x: region.x,
        y: region.y + subregion * (region.height / 4),
        width: region.width,
        height: region.height / 2,
      })
    );
  }

  private resetRegionSelection() {
    // let region = this.lastSonifierStateConfig.region;
    // this.store.dispatch(new workbenchActions.ClearSonifierRegionHistory({file: this.lastImageFile}));

    this.store.dispatch(
      new AddRegionToHistory(this.state.file.id, {
        x: 0.5,
        y: 0.5,
        width: getWidth(this.state.file),
        height: getHeight(this.state.file),
      })
    );
  }

  private undoRegionSelection() {
    this.store.dispatch(new UndoRegionSelection(this.state.file.id));
  }

  private redoRegionSelection() {
    this.store.dispatch(new RedoRegionSelection(this.state.file.id));
  }

  private setRegionMode($event: MatButtonToggleChange) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.state.file.id, {
        regionMode: $event.value,
      })
    );
  }

  private setDuration(value) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.state.file.id, { duration: value })
    );
  }

  private setToneCount(value) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.state.file.id, { toneCount: value })
    );
  }

  private setViewportSync(value) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.state.file.id, {
        viewportSync: value.checked,
      })
    );
  }

  private sonify() {
    if (!this.sonificationUri) return;
    if (
      this.sonificationSrcUri == this.sonificationUri &&
      this.api &&
      this.api.canPlay
    ) {
      this.api.getDefaultMedia().play();
    } else {
      this.sonificationSrcUri = this.sonificationUri;
    }
  }

  onPlayerReady(api: VgAPI) {
    this.api = api;

    let stop$ = from(this.api.getDefaultMedia().subscriptions.ended);
    let start$ = from(this.api.getDefaultMedia().subscriptions.playing);

    this.subs.push(
      from(this.api.getDefaultMedia().subscriptions.canPlayThrough).subscribe(
        (canPlayThrough) => {
          this.loading = false;
        }
      )
    );

    this.subs.push(
      from(this.api.getDefaultMedia().subscriptions.loadStart).subscribe(
        (canPlayThrough) => {
          this.loading = true;
        }
      )
    );

    let indexToneDuration = 0.852 / 2.0;
    this.progressLine$ = merge(
      start$.pipe(
        flatMap(() =>
          interval(10).pipe(takeUntil(merge(stop$, this.clearProgressLine$)))
        ),
        withLatestFrom(this.region$),
        map(([v, region]) => {
          if (!this.api.getDefaultMedia()) return null;
          if (!this.api.getDefaultMedia().duration) return null;
          if (!region) return null;
          // console.log(region, this.api.getDefaultMedia().currentTime, indexToneDuration, this.api.getDefaultMedia().duration);
          let y =
            region.y +
            Math.max(
              0,
              Math.min(
                1,
                (this.api.getDefaultMedia().currentTime - indexToneDuration) /
                  (this.api.getDefaultMedia().duration - 2 * indexToneDuration)
              )
            ) *
              region.height;

          return { x1: region.x, y1: y, x2: region.x + region.width, y2: y };
        })
      ),
      stop$.pipe(map(() => null)),
      this.clearProgressLine$.pipe(map(() => null))
    );

    this.subs.push(
      this.progressLine$.pipe(distinctUntilChanged()).subscribe((line) => {
        this.store.dispatch(new SetProgressLine(this.state.file.id, line));
      })
    );
  }
}
