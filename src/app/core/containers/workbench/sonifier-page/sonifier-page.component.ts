import { Component, AfterViewInit, ViewChild, OnDestroy, OnChanges} from '@angular/core';

import {VgAPI} from 'videogular2/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import { SonifierRegionOption } from '../../../models/sonifier-file-state';
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
  lastImageFile: ImageFile;
  lastViewerState: ViewerFileState;
  lastSonifierState: SonifierFileState;
  sonificationSrcUri: string = null;
  SonifierRegionOption = SonifierRegionOption;
  showPlayer: boolean = false;
  api:VgAPI;
  viewportSize: {width: number, height: number} = null;
  subs: Subscription[] = [];
      

  constructor(private store: Store<fromRoot.State>, private afterglowService: AfterglowDataFileService) {
    this.imageFile$ = store.select(fromCore.workbench.getImageFile);
    this.viewerState$ = store.select(fromCore.workbench.getViewerFileState);
    this.sonifierState$ = store.select(fromCore.workbench.getSonifierFileState);
    
    this.subs.push(this.imageFile$.subscribe(imageFile => this.lastImageFile = imageFile));
    this.subs.push(this.viewerState$.subscribe(viewerState => this.lastViewerState = viewerState));
    this.subs.push(this.sonifierState$.subscribe(sonifierState => this.lastSonifierState = sonifierState));

  }
    

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ngOnChanges() {
    if(this.lastImageFile && this.lastSonifierState && this.sonificationSrcUri != null && this.lastSonifierState.region) {
      let newUri = this.afterglowService.getSonificationUri(
      this.lastImageFile.id,
      this.lastSonifierState.region,
      this.lastSonifierState.duration,
      this.lastSonifierState.toneCount
      );
      if(newUri != this.sonificationSrcUri) this.sonificationSrcUri = null;
    }
    else {
      this.sonificationSrcUri = null;
    }
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
      }}))
  }

  private selectSubregionByFrequency(subregion: number) {
    let region = this.lastSonifierState.region;
    this.store.dispatch(new sonifierActions.SetRegion({file: this.lastImageFile,
      storeInHistory: true,
      region: {
        x: region.x + subregion * (region.width/4),
        y: region.y,
        width: region.width/2,
        height: region.height
      }
    }))
  }

  private selectSubregionByTime(subregion: number) {
    let region = this.lastSonifierState.region;
    this.store.dispatch(new sonifierActions.SetRegion({file: this.lastImageFile,
      storeInHistory: true,
      region: {
        x: region.x,
        y: region.y + subregion * (region.height/4),
        width: region.width,
        height: region.height/2
      }
    }))

  }

  private resetRegionSelection() {
    // let region = this.lastSonifierStateConfig.region;
    // this.store.dispatch(new workbenchActions.ClearSonifierRegionHistory({file: this.lastImageFile}));
    
    this.store.dispatch(new sonifierActions.SetRegion({file: this.lastImageFile,
      storeInHistory: true,
      region: {
        x: 0,
        y: 0,
        width: getWidth(this.lastImageFile),
        height: getHeight(this.lastImageFile)
      }
    }));
  }

  private undoRegionSelection() {
    this.store.dispatch(new sonifierActions.UndoRegionSelection({file: this.lastImageFile}));
  }

  private redoRegionSelection() {
    this.store.dispatch(new sonifierActions.RedoRegionSelection({file: this.lastImageFile}));
  }

  private setRegionMethod(value: SonifierRegionOption) {
    this.store.dispatch(new sonifierActions.UpdateFileState({file: this.lastImageFile, changes: {regionOption: value}}))
  }

  private setDuration(value) {
    this.store.dispatch(new sonifierActions.UpdateFileState({file: this.lastImageFile, changes: {duration: value}}))
  }

  private setToneCount(value) {
    this.store.dispatch(new sonifierActions.UpdateFileState({file: this.lastImageFile, changes: {toneCount: value}}))
  }

  private setViewportSync(value) {
    this.store.dispatch(new sonifierActions.UpdateFileState({file: this.lastImageFile, changes: {viewportSync: value.checked}}))
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
    // console.log(this.currentSonificationUri);
    // this.sonificationUri$.next(this.currentSonificationUri);
    this.sonificationSrcUri = this.afterglowService.getSonificationUri(
      this.lastImageFile.id,
      this.lastSonifierState.region,
      this.lastSonifierState.duration,
      this.lastSonifierState.toneCount
    )
  }

  onPlayerReady(api:VgAPI) {
    this.api = api;
  }

 


}

