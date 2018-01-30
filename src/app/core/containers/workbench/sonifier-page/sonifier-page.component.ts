import { Component, AfterViewInit, ViewChild, OnDestroy, OnChanges } from '@angular/core';
import 'rxjs/add/operator/map'

import { VgAPI } from 'videogular2/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import { SonifierRegionMode } from '../../../models/sonifier-file-state';
import { ViewerFileState } from '../../../models/viewer-file-state';
import { SonifierFileState } from '../../../models/sonifier-file-state';
import { ViewportChangeEvent } from '../../../components/pan-zoom-viewer/pan-zoom-viewer.component';
import { AfterglowDataFileService } from '../../../services/afterglow-data-files';
import { ImageFile, getWidth, getHeight } from '../../../../data-files/models/data-file';

import * as fromRoot from '../../../../reducers';
import * as fromCore from '../../../reducers';
import * as workbenchActions from '../../../actions/workbench';
import * as sonifierActions from '../../../actions/sonifier';

@Component({
  selector: 'app-sonifier-page',
  templateUrl: './sonifier-page.component.html',
  styleUrls: ['./sonifier-page.component.css']
})
export class SonifierPageComponent implements AfterViewInit, OnDestroy, OnChanges {
  imageFile$: Observable<ImageFile>;
  viewerState$: Observable<ViewerFileState>;
  sonifierState$: Observable<SonifierFileState>;
  showConfig$: Observable<boolean>;
  lastImageFile: ImageFile;
  lastViewerState: ViewerFileState;
  lastSonifierState: SonifierFileState;
  sonificationSrcUri: string = null;
  clearProgressLine$: Observable<boolean>;
  progressLine$: Observable<{ x1: number, y1: number, x2: number, y2: number }>;

  SonifierRegionMode = SonifierRegionMode;
  showPlayer: boolean = false;
  api: VgAPI;
  viewportSize: { width: number, height: number } = null;
  subs: Subscription[] = [];


  constructor(private store: Store<fromRoot.State>, private afterglowService: AfterglowDataFileService) {
    this.imageFile$ = store.select(fromCore.workbench.getImageFile);
    this.viewerState$ = store.select(fromCore.workbench.getViewerFileState);
    this.sonifierState$ = store.select(fromCore.workbench.getSonifierFileState);
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);

    this.clearProgressLine$ = this.sonifierState$.filter(state => {
      return (state && this.sonificationSrcUri != state.sonificationUri)
    })
    .map(() => true)

    this.subs.push(this.imageFile$.subscribe(imageFile => this.lastImageFile = imageFile));
    this.subs.push(this.viewerState$.subscribe(viewerState => this.lastViewerState = viewerState));
    this.subs.push(this.sonifierState$.subscribe(sonifierState => {
      this.lastSonifierState = sonifierState;
      if (sonifierState && this.sonificationSrcUri != sonifierState.sonificationUri) this.sonificationSrcUri = null;
    }));

  }


  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ngOnChanges() {
  }

  onViewportChange($event: ViewportChangeEvent) {
    this.store.dispatch(new sonifierActions.UpdateViewport({
      file: this.lastImageFile,
      viewport: {
        imageX: $event.imageX,
        imageY: $event.imageY,
        imageWidth: $event.imageWidth,
        imageHeight: $event.imageHeight,
        viewportWidth: $event.viewportWidth,
        viewportHeight: $event.viewportHeight
      }
    }))
  }

  private selectSubregionByFrequency(subregion: number) {
    let region = this.lastSonifierState.region;
    this.store.dispatch(new sonifierActions.AddRegionToHistory({
      file: this.lastImageFile,
      region: {
        x: region.x + subregion * (region.width / 4),
        y: region.y,
        width: region.width / 2,
        height: region.height
      }
    }))
  }

  private selectSubregionByTime(subregion: number) {
    let region = this.lastSonifierState.region;
    this.store.dispatch(new sonifierActions.AddRegionToHistory({
      file: this.lastImageFile,
      region: {
        x: region.x,
        y: region.y + subregion * (region.height / 4),
        width: region.width,
        height: region.height / 2
      }
    }))

  }

  private resetRegionSelection() {
    // let region = this.lastSonifierStateConfig.region;
    // this.store.dispatch(new workbenchActions.ClearSonifierRegionHistory({file: this.lastImageFile}));

    this.store.dispatch(new sonifierActions.AddRegionToHistory({
      file: this.lastImageFile,
      region: {
        x: 0,
        y: 0,
        width: getWidth(this.lastImageFile),
        height: getHeight(this.lastImageFile)
      }
    }));
  }

  private undoRegionSelection() {
    this.store.dispatch(new sonifierActions.UndoRegionSelection({ file: this.lastImageFile }));
  }

  private redoRegionSelection() {
    this.store.dispatch(new sonifierActions.RedoRegionSelection({ file: this.lastImageFile }));
  }

  private setRegionMode(value: SonifierRegionMode) {
    this.store.dispatch(new sonifierActions.SetRegionMode({ file: this.lastImageFile, mode: value }))
  }

  private setDuration(value) {
    this.store.dispatch(new sonifierActions.UpdateFileState({ file: this.lastImageFile, changes: { duration: value } }))
  }

  private setToneCount(value) {
    this.store.dispatch(new sonifierActions.UpdateFileState({ file: this.lastImageFile, changes: { toneCount: value } }))
  }

  private setViewportSync(value) {
    this.store.dispatch(new sonifierActions.UpdateFileState({ file: this.lastImageFile, changes: { viewportSync: value.checked } }))
  }


  // private onViewportChange() {
  //   //requires header loaded
  //   if(this.sonifierStore.getRegionOption() == SonifierRegionOption.VIEWPORT) {
  //     let ul = this.imageFile.viewerState.viewportToImage({x: 0, y: 0});
  //     let lr = this.imageFile.viewerState.viewportToImage({x: this.viewer.width, y: this.viewer.height});


  //     let x = Math.max(0, ul.x);
  //     let y = Math.max(0, ul.y);
  //     this.sonifierStore.setRegion({
  //       x: x,
  //       y: y,
  //       width: Math.min(this.imageFile.width, lr.x) - x,
  //       height: Math.min(this.imageFile.height, lr.y) - y
  //     },
  //     false);
  //   }
  // }

  private sonify() {
    if(this.sonificationSrcUri == this.lastSonifierState.sonificationUri && this.api && this.api.canPlay) {
      this.api.getDefaultMedia().play();
    }
    else {
      this.sonificationSrcUri = this.lastSonifierState.sonificationUri;
    }
    
  }

  onPlayerReady(api: VgAPI) {
    this.api = api;

    let stop$ = Observable.from(this.api.getDefaultMedia().subscriptions.ended);
    let start$ = Observable.from(this.api.getDefaultMedia().subscriptions.playing);


    this.progressLine$ = Observable.merge(
      start$.flatMap(() => Observable.interval(10).takeUntil(stop$.merge(this.clearProgressLine$)))
      .map(() => {
        if(!this.api.getDefaultMedia()) return null;
        if (this.api.getDefaultMedia().duration == 0) return null;
        let region = this.lastSonifierState.region;
        if (!region) return null;

        let y = region.y + (this.api.getDefaultMedia().currentTime / this.api.getDefaultMedia().duration) * region.height;

        return { x1: region.x, y1: y, x2: region.x + region.width, y2: y };
      }),
      stop$.map(() => null),
      this.clearProgressLine$.map(() => null)
    )





    // this.api.getDefaultMedia().subscriptions.playing.subscribe(
    //   () => {
    //     // Set the video to the beginning
    //     console.log('playing');
    //     console.log(this.api.getDefaultMedia().duration);
    //     console.log(this.api.getDefaultMedia().currentTime);
    //     this.playing$.next(true);
    //   }
    // );

    // this.api.getDefaultMedia().subscriptions.timeUpdate.subscribe(
    //   () => {
    //     // Set the video to the beginning
    //     this.progressLine$.next()
    //     console.log(this.api.getDefaultMedia().duration);
    //     console.log(this.api.getDefaultMedia().currentTime);
    //   }
    // );

    // this.api.getDefaultMedia().subscriptions.ended.subscribe(
    //   () => {
    //     // Set the video to the beginning
    //     console.log('ended');
    //     console.log(this.api.getDefaultMedia().duration);
    //     console.log(this.api.getDefaultMedia().currentTime);
    //     this.playing$.next(false);
    //   }
    // );


  }




}

