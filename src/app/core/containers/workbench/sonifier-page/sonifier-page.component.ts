import {
  Component,
  AfterViewInit,
  ViewChild,
  OnDestroy,
  OnChanges,
  OnInit,
  HostBinding,
  Input
} from "@angular/core";

import { VgAPI } from "videogular2/core";
import { Observable, Subscription, from, merge, interval, combineLatest } from "rxjs";
import {
  filter,
  map,
  flatMap,
  takeUntil,
  distinctUntilChanged,
  withLatestFrom,
  tap
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

import { ImageFileState } from "../../../models/image-file-state";
import { Viewer } from "../../../models/viewer";
import { Marker, MarkerType, RectangleMarker, LineMarker } from "../../../models/marker";
import { WorkbenchTool } from "../../../models/workbench-state";
import {
  Hotkey,
  HotkeysService
} from "../../../../../../node_modules/angular2-hotkeys";
import { ChangeDetectorRef } from "@angular/core";
import { Router } from '@angular/router';
import { MatButtonToggleChange } from '@angular/material';
import { Store, Actions, ofActionSuccessful } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { SetActiveTool, SetLastRouterPath, SetViewerFile, SetViewerMarkers, ClearViewerMarkers } from '../../../workbench.actions';
import { AddRegionToHistory, UndoRegionSelection, RedoRegionSelection, UpdateSonifierFileState, SetProgressLine } from '../../../image-files.actions';
import { Region } from '../../../models/region';
import { getViewportRegion } from '../../../models/transformation';
import { ImageFilesState } from '../../../image-files.state';
import { WorkbenchPageBaseComponent } from '../workbench-page-base/workbench-page-base.component';
import { LoadDataFileHdr } from '../../../../data-files/data-files.actions';
import { DataFilesState } from '../../../../data-files/data-files.state';

@Component({
  selector: "app-sonifier-page",
  templateUrl: "./sonifier-page.component.html",
  styleUrls: ["./sonifier-page.component.css"]
})
export class SonifierPageComponent extends WorkbenchPageBaseComponent
  implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  @HostBinding("class") @Input("class") classList: string =
    "fx-workbench-outlet";
  markerUpdater: Subscription;
  sonifierState$: Observable<SonifierFileState>;
  sonificationUri$: Observable<string>;
  sonificationUri: string;
  regionMode: SonifierRegionMode;
  lastImageFile: ImageFile;
  lastViewerState: Normalization;
  lastRegion: Region;
  sonificationSrcUri: string = null;
  clearProgressLine$: Observable<boolean>;
  region$: Observable<Region>;
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
    private afterglowService: AfterglowDataFileService,
    private _hotkeysService: HotkeysService,
    private ref: ChangeDetectorRef,
    private afterglowDataFileService: AfterglowDataFileService,
    private actions$: Actions,
    store: Store,
    router: Router
  ) {
    super(store, router);
    this.sonifierState$ = this.activeImageFileState$.pipe(
      filter(state => state != null),
      map(state => state.sonifier)
    );

    this.region$ = combineLatest(this.activeImageFile$, this.activeImageFileState$, this.sonifierState$).pipe(
      map(([imageFile, imageFileState, sonifierState]) => {
        if (sonifierState.regionMode == SonifierRegionMode.CUSTOM) return sonifierState.regionHistory[sonifierState.regionHistoryIndex];
        if (!imageFile || !imageFile.headerLoaded || !imageFileState.transformation || !imageFileState.transformation.viewportSize || !imageFileState.transformation.imageToViewportTransform) return null;
        return getViewportRegion(imageFileState.transformation, imageFile);
      })
    )

    this.sonificationUri$ = combineLatest(this.region$, this.activeImageFile$, this.sonifierState$).pipe(
      map(([region, imageFile, sonifierState]) => {
        if (!region) return null;
        return this.afterglowDataFileService.getSonificationUri(
          imageFile.id,
          region,
          sonifierState.duration,
          sonifierState.toneCount
        );
      }),
      distinctUntilChanged()
    )

    this.clearProgressLine$ = this.sonificationUri$.pipe(
      filter(uri => {
        return this.sonificationSrcUri != uri;
      }),
      map(() => true),
      tap(() => this.sonificationSrcUri = null)
    );

    this.markerUpdater = combineLatest(
      this.viewerFileIds$,
      this.viewerImageFileHeaders$,
      this.store.select(ImageFilesState.getEntities),
    ).pipe(
      withLatestFrom(
        this.store.select(WorkbenchState.getViewers),
        this.store.select(DataFilesState.getEntities)
      )
    ).subscribe(([[fileIds, imageFiles, imageFileStates], viewers, dataFiles]) => {
      viewers.forEach((viewer) => {
        let fileId = viewer.fileId;
        if (fileId == null || !dataFiles[fileId]) {
          this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
          return;
        }
        let file = dataFiles[fileId] as ImageFile;
        if (!file.headerLoaded) {
          this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
          return;
        }
        let sonifier = imageFileStates[fileId].sonifier;
        let region = sonifier.regionHistory[sonifier.regionHistoryIndex];
        let regionMode = sonifier.regionMode;
        let progressLine = sonifier.progressLine;
        let markers: Array<RectangleMarker | LineMarker> = [];
        if (region && regionMode == SonifierRegionMode.CUSTOM)
          markers.push({
            type: MarkerType.RECTANGLE,
            ...region
          } as RectangleMarker);
        if (progressLine)
          markers.push({ type: MarkerType.LINE, ...progressLine } as LineMarker);
        this.store.dispatch(new SetViewerMarkers(viewer.viewerId, markers));
      })
    });

    this.subs.push(
      this.sonificationUri$.subscribe(uri => { this.sonificationUri = uri })
    )

    this.subs.push(
      this.region$.subscribe(region => { this.lastRegion = region })
    )

    this.subs.push(
      this.activeImageFile$.subscribe(imageFile => (this.lastImageFile = imageFile))
    );
    // this.subs.push(
    //   this.sonifierState$.subscribe(sonifierState => {
    //     this.lastSonifierState = sonifierState;
    //     if (
    //       sonifierState &&
    //       this.sonificationSrcUri != sonifierState.sonificationUri
    //     )
    //       this.sonificationSrcUri = null;
    //   })
    // );

    this.store.dispatch(
      new SetActiveTool(WorkbenchTool.SONIFIER)
    );

    this.store.dispatch(
      new SetLastRouterPath(router.url)
    )

    this.hotKeys.push(
      new Hotkey(
        "t 1",
        (event: KeyboardEvent): boolean => {
          if (this.store.selectSnapshot(ImageFilesState.getEntities)[this.lastImageFile.id].sonifier.regionMode != SonifierRegionMode.CUSTOM)
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
          if (this.store.selectSnapshot(ImageFilesState.getEntities)[this.lastImageFile.id].sonifier.regionMode != SonifierRegionMode.CUSTOM)
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
          if (this.store.selectSnapshot(ImageFilesState.getEntities)[this.lastImageFile.id].sonifier.regionMode != SonifierRegionMode.CUSTOM)
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
          if (this.store.selectSnapshot(ImageFilesState.getEntities)[this.lastImageFile.id].sonifier.regionMode != SonifierRegionMode.CUSTOM)
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
          if (this.store.selectSnapshot(ImageFilesState.getEntities)[this.lastImageFile.id].sonifier.regionMode != SonifierRegionMode.CUSTOM)
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
          if (this.store.selectSnapshot(ImageFilesState.getEntities)[this.lastImageFile.id].sonifier.regionMode != SonifierRegionMode.CUSTOM)
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
          if (this.store.selectSnapshot(ImageFilesState.getEntities)[this.lastImageFile.id].sonifier.regionMode != SonifierRegionMode.CUSTOM)
            return true;
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

    this.hotKeys.forEach(hotKey => this._hotkeysService.add(hotKey));
  }

  ngOnInit() {
  }

  ngAfterViewInit() { }

  ngOnDestroy() {
    this.store.dispatch(new ClearViewerMarkers());

    this.subs.forEach(sub => sub.unsubscribe());
    this.hotKeys.forEach(hotKey => this._hotkeysService.remove(hotKey));
    this.markerUpdater.unsubscribe();
  }

  ngOnChanges() { }

  private selectSubregionByFrequency(subregion: number) {
    let sonifierState = this.store.selectSnapshot(ImageFilesState.getEntities)[this.lastImageFile.id].sonifier;
    let region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
    this.store.dispatch(
      new AddRegionToHistory(
        this.lastImageFile.id,
        {
          x: region.x + subregion * (region.width / 4),
          y: region.y,
          width: region.width / 2,
          height: region.height
        }
      )
    );
  }

  private selectSubregionByTime(subregion: number) {
    let sonifierState = this.store.selectSnapshot(ImageFilesState.getEntities)[this.lastImageFile.id].sonifier;
    let region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
    this.store.dispatch(
      new AddRegionToHistory(
        this.lastImageFile.id,
        {
          x: region.x,
          y: region.y + subregion * (region.height / 4),
          width: region.width,
          height: region.height / 2
        }
      )
    );
  }

  private resetRegionSelection() {
    // let region = this.lastSonifierStateConfig.region;
    // this.store.dispatch(new workbenchActions.ClearSonifierRegionHistory({file: this.lastImageFile}));

    this.store.dispatch(
      new AddRegionToHistory(
        this.lastImageFile.id,
        {
          x: 0.5,
          y: 0.5,
          width: getWidth(this.lastImageFile),
          height: getHeight(this.lastImageFile)
        }
      )
    );
  }

  private undoRegionSelection() {
    this.store.dispatch(
      new UndoRegionSelection(this.lastImageFile.id)
    );
  }

  private redoRegionSelection() {
    this.store.dispatch(
      new RedoRegionSelection(this.lastImageFile.id)
    );
  }

  private setRegionMode($event: MatButtonToggleChange) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.lastImageFile.id, { regionMode: $event.value })
    );
  }

  private setDuration(value) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.lastImageFile.id, { duration: value })
    );
  }

  private setToneCount(value) {
    this.store.dispatch(
      new UpdateSonifierFileState(this.lastImageFile.id, { toneCount: value })
    );
  }

  private setViewportSync(value) {
    this.store.dispatch(
      new UpdateSonifierFileState(
        this.lastImageFile.id,
        { viewportSync: value.checked }
      )
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

    let indexToneDuration = .852 / 2.0;
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
            Math.max(0, Math.min(1, ((this.api.getDefaultMedia().currentTime - indexToneDuration) /
              (this.api.getDefaultMedia().duration - (2 * indexToneDuration))))) *
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
          new SetProgressLine(this.lastImageFile.id, line)
        );
      })
    );
  }
}
