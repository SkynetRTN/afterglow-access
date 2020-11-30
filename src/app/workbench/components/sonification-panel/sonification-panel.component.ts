import { Component, AfterViewInit, ViewChild, OnDestroy, OnChanges, OnInit, HostBinding, Input } from "@angular/core";

import { VgAPI } from "videogular2/compiled/core";
import { Observable, Subscription, from, merge, interval, combineLatest, BehaviorSubject } from "rxjs";
import { filter, map, flatMap, takeUntil, distinctUntilChanged, withLatestFrom, tap, skip } from "rxjs/operators";

import { SonifierRegionMode, SonificationPanelState } from "../../models/sonifier-file-state";
import { AfterglowDataFileService } from "../../services/afterglow-data-files";
import { getWidth, getHeight, DataFile, ImageHdu } from "../../../data-files/models/data-file";
import { Hotkey, HotkeysService } from "angular2-hotkeys";
import { ChangeDetectorRef } from "@angular/core";
import { Router } from "@angular/router";
import { MatButtonToggleChange } from "@angular/material/button-toggle";
import { Store, Actions } from "@ngxs/store";
import {
  AddRegionToHistory,
  UndoRegionSelection,
  RedoRegionSelection,
  UpdateSonifierFileState,
  SetProgressLine,
  Sonify,
  ClearSonification,
} from "../../workbench.actions";
import { DataFilesState } from "../../../data-files/data-files.state";
import { Region } from "../../../data-files/models/region";
import { getViewportRegion, Transform, getImageToViewportTransform } from "../../../data-files/models/transformation";

@Component({
  selector: "app-sonification-panel",
  templateUrl: "./sonification-panel.component.html",
  styleUrls: ["./sonification-panel.component.css"],
})
export class SonificationPanelComponent implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  @Input("hdu")
  set hdu(hdu: ImageHdu) {
    this.hdu$.next(hdu);
  }
  get hdu() {
    return this.hdu$.getValue();
  }
  private hdu$ = new BehaviorSubject<ImageHdu>(null);

  @Input("imageTransform")
  set imageTransform(imageTransform: Transform) {
    this.imageTransform$.next(imageTransform);
  }
  get imageTransform() {
    return this.imageTransform$.getValue();
  }
  private imageTransform$ = new BehaviorSubject<Transform>(null);

  @Input("viewportTransform")
  set viewportTransform(viewportTransform: Transform) {
    this.viewportTransform$.next(viewportTransform);
  }
  get viewportTransform() {
    return this.viewportTransform$.getValue();
  }
  private viewportTransform$ = new BehaviorSubject<Transform>(null);

  @Input("viewportSize")
  set viewportSize(viewportSize: { width: number; height: number }) {
    this.viewportSize$.next(viewportSize);
  }
  get viewportSize() {
    return this.viewportSize$.getValue();
  }
  private viewportSize$ = new BehaviorSubject<{ width: number; height: number }>(null);

  @Input("state")
  set state(state: SonificationPanelState) {
    this.state$.next(state);
  }
  get state() {
    return this.state$.getValue();
  }
  private state$ = new BehaviorSubject<SonificationPanelState>(null);

  SonifierRegionMode = SonifierRegionMode;
  region$: Observable<Region>;
  region: Region;
  sonificationUri$: Observable<string>;
  sonificationUri: string = null;
  sonificationSrcUri: string = null;
  loading$: Observable<boolean>;
  playerLoading: boolean = false;
  showPlayer: boolean = false;
  api: VgAPI;
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
    let imageToViewportTransform$ = combineLatest(this.viewportTransform$, this.imageTransform$).pipe(
      map(([viewportTransform, imageTransform]) => {
        if (!viewportTransform || !imageTransform) {
          return null;
        }
        return getImageToViewportTransform(viewportTransform, imageTransform);
      })
    );
    this.region$ = combineLatest(this.hdu$, imageToViewportTransform$, this.viewportSize$, this.state$).pipe(
      filter(([hdu, transform, viewportSize, state]) => state !== null && hdu !== null),
      map(([hdu, transform, viewportSize, state]) => {
        if (state.regionMode == SonifierRegionMode.CUSTOM) {
          this.region = state.regionHistory[state.regionHistoryIndex];
        } else if (!hdu || !transform || !viewportSize) {
          this.region = null;
        } else {
          let rawImageData = this.store.selectSnapshot(DataFilesState.getImageDataEntities)[hdu.rawImageDataId];
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
      distinctUntilChanged((a, b) => a && b && a.x == b.x && a.y == b.y && a.width == b.width && a.height == b.height),
      tap((region) => this.store.dispatch(new ClearSonification(this.hdu.id)))
    );

    this.loading$ = this.state$.pipe(
      map((state) => state.sonificationJobProgress != null),
      distinctUntilChanged()
    );

    this.sonificationUri$ = this.state$.pipe(
      map((state) => state.sonificationUri),
      distinctUntilChanged(),
      tap((uri) => console.log("NEW SONIFICATION URI: ", uri))
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

  selectSubregionByFrequency(subregion: number) {
    let region = this.state.regionHistory[this.state.regionHistoryIndex];
    this.store.dispatch(
      new AddRegionToHistory(this.hdu.id, {
        x: region.x + subregion * (region.width / 4),
        y: region.y,
        width: region.width / 2,
        height: region.height,
      })
    );
  }

  selectSubregionByTime(subregion: number) {
    let region = this.state.regionHistory[this.state.regionHistoryIndex];
    this.store.dispatch(
      new AddRegionToHistory(this.hdu.id, {
        x: region.x,
        y: region.y + subregion * (region.height / 4),
        width: region.width,
        height: region.height / 2,
      })
    );
  }

  resetRegionSelection() {
    // let region = this.lastSonifierStateConfig.region;
    // this.store.dispatch(new workbenchActions.ClearSonifierRegionHistory({file: this.lastImageFile}));
    let header = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[this.hdu.headerId];
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

  setDuration(value) {
    this.store.dispatch(new UpdateSonifierFileState(this.hdu.id, { duration: value }));
  }

  setToneCount(value) {
    this.store.dispatch(new UpdateSonifierFileState(this.hdu.id, { toneCount: value }));
  }

  setViewportSync(value) {
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

  onPlayerReady(api: VgAPI) {
    console.log("ON PLAYER READY");
    this.api = api;

    let stop$ = from(this.api.getDefaultMedia().subscriptions.ended);
    let start$ = from(this.api.getDefaultMedia().subscriptions.playing);

    this.subs.push(
      from(this.api.getDefaultMedia().subscriptions.canPlayThrough).subscribe((canPlayThrough) => {
        this.playerLoading = false;
      })
    );

    this.subs.push(
      from(this.api.getDefaultMedia().subscriptions.loadStart).subscribe((canPlayThrough) => {
        this.playerLoading = true;
      })
    );

    let indexToneDuration = 0.852 / 2.0;
    this.progressLine$ = merge(
      start$.pipe(
        tap((v) => console.log("STARTED!!!!!!!!!!!!!!!!!!!!!!!!!!!")),
        flatMap(() => interval(10).pipe(takeUntil(merge(stop$, this.sonificationUri$.pipe(skip(1)))))),
        withLatestFrom(this.region$),
        map(([v, region]) => {
          console.log(this.api.getDefaultMedia(), region);
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
      this.sonificationUri$.pipe(
        skip(1),
        map(() => null)
      )
    );

    this.subs.push(
      this.progressLine$.pipe(distinctUntilChanged()).subscribe((line) => {
        this.store.dispatch(new SetProgressLine(this.hdu.id, line));
      })
    );
  }
}
