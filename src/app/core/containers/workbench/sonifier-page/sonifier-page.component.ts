import { Component, AfterViewInit, ViewChild, OnDestroy, OnChanges} from '@angular/core';

import {VgAPI} from 'videogular2/core';

import { Store } from '@ngrx/store';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import * as fromRoot from '../../../../reducers';
import { ImageFile, getWidth, getHeight } from '../../../../data-files/models/data-file';

import * as fromCore from '../../../reducers';
import * as workbenchActions from '../../../actions/workbench';
import { SonifierRegionOption } from '../../../models/sonifier-file-state';
import { ViewerFileState } from '../../../models/viewer-file-state';
import { SonifierFileState } from '../../../models/sonifier-file-state';
import { ViewportChangeEvent } from '../../../components/pan-zoom-viewer/pan-zoom-viewer.component';
import { AfterglowDataFileService } from '../../../services/afterglow-data-files';


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
  stateSub: Subscription;
  sonificationSrcUri: string = null;
  SonifierRegionOption = SonifierRegionOption;
  showPlayer: boolean = false;
  api:VgAPI;
  viewportSize: {width: number, height: number} = null;
      

  constructor(private store: Store<fromRoot.State>, private afterglowService: AfterglowDataFileService) {
    let selectedFileWorkspaceState$ = store.select(fromCore.getSelectedFileWorkbenchState);
    this.imageFile$ = selectedFileWorkspaceState$.map(state => state && state.file);
    this.viewerState$ = selectedFileWorkspaceState$.map(state => state && state.fileState.viewer);
    this.sonifierState$ = selectedFileWorkspaceState$.map(state => state && state.fileState.sonifier);
    
    this.stateSub = selectedFileWorkspaceState$.subscribe(state => {
      this.lastImageFile = state && state.file;
      this.lastViewerState = state && state.fileState && state.fileState.viewer;
      this.lastSonifierState = state && state.fileState && state.fileState.sonifier;
    });

  }
    

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    if(this.stateSub) this.stateSub.unsubscribe();
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
    if(this.lastSonifierState.regionOption == SonifierRegionOption.VIEWPORT) {
      this.store.dispatch(new workbenchActions.SetSonifierRegion({file: this.lastImageFile,
        storeInHistory: false,
        region: {
        x: $event.imageX,
        y: $event.imageY,
        width: $event.imageWidth,
        height: $event.imageHeight
      }}))
      this.sonificationSrcUri = null;
    }
    this.viewportSize = {width: $event.viewportWidth, height: $event.viewportHeight};
  }

  private selectSubregionByFrequency(subregion: number) {
    let region = this.lastSonifierState.region;
    this.store.dispatch(new workbenchActions.SetSonifierRegion({file: this.lastImageFile,
      storeInHistory: true,
      region: {
      x: region.x + subregion * (region.width/4),
      y: region.y,
      width: region.width/2,
      height: region.height
    }}))
  }

  private selectSubregionByTime(subregion: number) {
    let region = this.lastSonifierState.region;
    this.store.dispatch(new workbenchActions.SetSonifierRegion({file: this.lastImageFile,
      storeInHistory: true,
      region: {
      x: region.x,
      y: region.y + subregion * (region.height/4),
      width: region.width,
      height: region.height/2
    }}))
  }

  private resetRegionSelection() {
    // let region = this.lastSonifierStateConfig.region;
    // this.store.dispatch(new workbenchActions.ClearSonifierRegionHistory({file: this.lastImageFile}));
    
    this.store.dispatch(new workbenchActions.SetSonifierRegion({file: this.lastImageFile,
      storeInHistory: true,
      region: {
      x: 0,
      y: 0,
      width: getWidth(this.lastImageFile),
      height: getHeight(this.lastImageFile)
    }}));
  }

  private undoRegionSelection() {
    this.store.dispatch(new workbenchActions.UndoSonifierRegionSelection({file: this.lastImageFile}));
  }

  private redoRegionSelection() {
    this.store.dispatch(new workbenchActions.RedoSonifierRegionSelection({file: this.lastImageFile}));
  }

  private setRegionMethod(value: SonifierRegionOption) {
    this.store.dispatch(new workbenchActions.UpdateSonifierConfig({file: this.lastImageFile, changes: {regionOption: value}}))
  }

  private setDuration(value) {
    this.store.dispatch(new workbenchActions.UpdateSonifierConfig({file: this.lastImageFile, changes: {duration: value}}))
  }

  private setToneCount(value) {
    this.store.dispatch(new workbenchActions.UpdateSonifierConfig({file: this.lastImageFile, changes: {toneCount: value}}))
  }

  private setViewportSync(value) {
    this.store.dispatch(new workbenchActions.UpdateSonifierConfig({file: this.lastImageFile, changes: {viewportSync: value.checked}}))
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

