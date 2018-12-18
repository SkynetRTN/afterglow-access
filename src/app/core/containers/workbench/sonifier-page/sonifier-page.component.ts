import {
  Component,
  AfterViewInit,
  ViewChild,
  OnDestroy,
  OnChanges,
  OnInit
} from "@angular/core";

import { VgAPI } from "videogular2/core";
import { Store } from "@ngrx/store";
import { Observable, Subscription, from, merge, interval } from "rxjs";
import {
  filter,
  map,
  flatMap,
  takeUntil,
  distinctUntilChanged
} from "rxjs/operators";

import { SonifierRegionMode } from "../../../models/sonifier-file-state";
import { Normalization } from "../../../models/normalization";
import { SonifierFileState } from "../../../models/sonifier-file-state";
import { ViewportChangeEvent } from "../../../components/pan-zoom-canvas/pan-zoom-canvas.component";
import { AfterglowDataFileService } from "../../../services/afterglow-data-files";
import {
  ImageFile,
  getWidth,
  getHeight,
  DataFile
} from "../../../../data-files/models/data-file";

import * as fromRoot from "../../../../reducers";
import * as fromCore from "../../../reducers";
import * as fromDataFiles from "../../../../data-files/reducers";
import * as workbenchActions from "../../../actions/workbench";
import * as sonifierActions from "../../../actions/sonifier";
import { ImageFileState } from "../../../models/image-file-state";
import { Viewer } from "../../../models/viewer";
import { Dictionary } from "@ngrx/entity/src/models";
import { Marker, MarkerType } from "../../../models/marker";
import { WorkbenchTool } from "../../../models/workbench-state";
import {
  Hotkey,
  HotkeysService
} from "../../../../../../node_modules/angular2-hotkeys";
import { ChangeDetectorRef } from "@angular/core";

@Component({
  selector: "app-sonifier-page",
  templateUrl: "./sonifier-page.component.html",
  styleUrls: ["./sonifier-page.component.css"]
})
export class SonifierPageComponent
  implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  imageFile$: Observable<ImageFile>;
  imageFileState$: Observable<ImageFileState>;
  sonifierState$: Observable<SonifierFileState>;
  regionMode: SonifierRegionMode;
  showConfig$: Observable<boolean>;
  lastImageFile: ImageFile;
  lastViewerState: Normalization;
  lastSonifierState: SonifierFileState;
  sonificationSrcUri: string = null;
  clearProgressLine$: Observable<boolean>;
  progressLine$: Observable<{ x1: number; y1: number; x2: number; y2: number }>;
  markers$: Observable<Marker[]>;
  loading: boolean;
  hotKeys: Array<Hotkey> = [];

  SonifierRegionMode = SonifierRegionMode;
  showPlayer: boolean = false;
  api: VgAPI;
  viewportSize: { width: number; height: number } = null;
  subs: Subscription[] = [];
  activeViewer: Viewer;

  constructor(
    private store: Store<fromRoot.State>,
    private afterglowService: AfterglowDataFileService,
    private _hotkeysService: HotkeysService,
    private ref: ChangeDetectorRef
  ) {
    this.imageFile$ = store.select(fromCore.workbench.getActiveFile);
    this.imageFileState$ = store.select(fromCore.workbench.getActiveFileState);
    this.sonifierState$ = this.imageFileState$.pipe(
      filter(state => state != null),
      map(state => state.sonifier)
    );
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);

    this.clearProgressLine$ = this.sonifierState$.pipe(
      filter(state => {
        return state && this.sonificationSrcUri != state.sonificationUri;
      }),
      map(() => true)
    );

    this.subs.push(
      this.imageFile$.subscribe(imageFile => (this.lastImageFile = imageFile))
    );
    this.subs.push(
      this.sonifierState$.subscribe(sonifierState => {
        this.lastSonifierState = sonifierState;
        if (
          sonifierState &&
          this.sonificationSrcUri != sonifierState.sonificationUri
        )
          this.sonificationSrcUri = null;
      })
    );

    this.store.dispatch(
      new workbenchActions.SetActiveTool({ tool: WorkbenchTool.SONIFIER })
    );

    this.hotKeys.push(
      new Hotkey(
        "t 1",
        (event: KeyboardEvent): boolean => {
          if (this.lastSonifierState.regionMode != SonifierRegionMode.CUSTOM)
            return true;
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
          if (this.lastSonifierState.regionMode != SonifierRegionMode.CUSTOM)
            return true;
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
          if (this.lastSonifierState.regionMode != SonifierRegionMode.CUSTOM)
            return true;
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
          if (this.lastSonifierState.regionMode != SonifierRegionMode.CUSTOM)
            return true;
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
          if (this.lastSonifierState.regionMode != SonifierRegionMode.CUSTOM)
            return true;
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
          if (this.lastSonifierState.regionMode != SonifierRegionMode.CUSTOM)
            return true;
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
        "esc",
        (event: KeyboardEvent): boolean => {
          if (this.lastSonifierState.regionMode != SonifierRegionMode.CUSTOM)
            return true;
          this.resetRegionSelection();
          return false; // Prevent bubbling
        },
        undefined,
        "Reset Sonification Region"
      )
    );

    this.hotKeys.forEach(hotKey => this._hotkeysService.add(hotKey));
  }

  ngOnInit() {
    this.store.dispatch(new workbenchActions.DisableMultiFileSelection());
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
    this.hotKeys.forEach(hotKey => this._hotkeysService.remove(hotKey));
  }

  ngOnChanges() {}

  private selectSubregionByFrequency(subregion: number) {
    let region = this.lastSonifierState.region;
    this.store.dispatch(
      new sonifierActions.AddRegionToHistory({
        file: this.lastImageFile,
        region: {
          x: region.x + subregion * (region.width / 4),
          y: region.y,
          width: region.width / 2,
          height: region.height
        }
      })
    );
  }

  private selectSubregionByTime(subregion: number) {
    let region = this.lastSonifierState.region;
    this.store.dispatch(
      new sonifierActions.AddRegionToHistory({
        file: this.lastImageFile,
        region: {
          x: region.x,
          y: region.y + subregion * (region.height / 4),
          width: region.width,
          height: region.height / 2
        }
      })
    );
  }

  private resetRegionSelection() {
    // let region = this.lastSonifierStateConfig.region;
    // this.store.dispatch(new workbenchActions.ClearSonifierRegionHistory({file: this.lastImageFile}));

    this.store.dispatch(
      new sonifierActions.AddRegionToHistory({
        file: this.lastImageFile,
        region: {
          x: 0.5,
          y: 0.5,
          width: getWidth(this.lastImageFile),
          height: getHeight(this.lastImageFile)
        }
      })
    );
  }

  private undoRegionSelection() {
    this.store.dispatch(
      new sonifierActions.UndoRegionSelection({ file: this.lastImageFile })
    );
  }

  private redoRegionSelection() {
    this.store.dispatch(
      new sonifierActions.RedoRegionSelection({ file: this.lastImageFile })
    );
  }

  private setRegionMode(value: SonifierRegionMode) {
    this.store.dispatch(
      new sonifierActions.SetRegionMode({
        file: this.lastImageFile,
        mode: value
      })
    );
  }

  private setDuration(value) {
    this.store.dispatch(
      new sonifierActions.UpdateFileState({
        file: this.lastImageFile,
        changes: { duration: value }
      })
    );
  }

  private setToneCount(value) {
    this.store.dispatch(
      new sonifierActions.UpdateFileState({
        file: this.lastImageFile,
        changes: { toneCount: value }
      })
    );
  }

  private setViewportSync(value) {
    this.store.dispatch(
      new sonifierActions.UpdateFileState({
        file: this.lastImageFile,
        changes: { viewportSync: value.checked }
      })
    );
  }

  private sonify() {
    if (
      this.sonificationSrcUri == this.lastSonifierState.sonificationUri &&
      this.api &&
      this.api.canPlay
    ) {
      this.api.getDefaultMedia().play();
    } else {
      this.sonificationSrcUri = this.lastSonifierState.sonificationUri;
    }
  }

  onPlayerReady(api: VgAPI) {
    this.api = api;

    let stop$ = from(this.api.getDefaultMedia().subscriptions.ended);
    let start$ = from(this.api.getDefaultMedia().subscriptions.playing);

    this.subs.push(
      from(this.api.getDefaultMedia().subscriptions.canPlayThrough).subscribe(
        canPlayThrough => {
          this.loading = false;
        }
      )
    );

    this.subs.push(
      from(this.api.getDefaultMedia().subscriptions.loadStart).subscribe(
        canPlayThrough => {
          this.loading = true;
        }
      )
    );

    this.progressLine$ = merge(
      start$.pipe(
        flatMap(() =>
          interval(10).pipe(takeUntil(merge(stop$, this.clearProgressLine$)))
        ),
        map(() => {
          if (!this.api.getDefaultMedia()) return null;
          if (this.api.getDefaultMedia().duration == 0) return null;
          let region = this.lastSonifierState.region;
          if (!region) return null;

          let y =
            region.y +
            (this.api.getDefaultMedia().currentTime /
              this.api.getDefaultMedia().duration) *
              region.height;

          return { x1: region.x, y1: y, x2: region.x + region.width, y2: y };
        })
      ),
      stop$.pipe(map(() => null)),
      this.clearProgressLine$.pipe(map(() => null))
    );

    this.subs.push(
      this.progressLine$.pipe(distinctUntilChanged()).subscribe(line => {
        this.store.dispatch(
          new sonifierActions.SetProgressLine({
            file: this.lastImageFile,
            line: line
          })
        );
      })
    );
  }
}
