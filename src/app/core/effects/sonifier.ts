import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { Effect, Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';

import { ImageFile, getWidth, getHeight } from '../../data-files/models/data-file';
import { DataFileType } from '../../data-files/models/data-file-type';
import { SourceExtractorRegionOption } from '../models/source-extractor-file-state';
import { SonifierRegionOption } from '../models/sonifier-file-state';
import { normalize } from '../models/pixel-normalizer';
import * as dataFileActions from '../../data-files/actions/data-file';
import * as sonifierActions from '../actions/sonifier';
import * as viewerActions from '../actions/viewer';
import * as sourceExtractorActions from '../actions/source-extractor';
import * as imageFileActions from '../../data-files/actions/image-file';
import * as fromCore from '../reducers';
import * as fromDataFile from '../../data-files/reducers';

import { AfterglowDataFileService } from '../services/afterglow-data-files';
import { view } from 'paper';


@Injectable()
export class SonifierEffects {
  
  
@Effect()
headerLoaded$: Observable<Action> = this.actions$
  .ofType<dataFileActions.LoadDataFileHdrSuccess>(dataFileActions.LOAD_DATA_FILE_HDR_SUCCESS)
  .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getSourceExtractorFileStates),
    this.store.select(fromCore.getSonifierFileStates)
  )
  .flatMap(([action, dataFiles, sourceExtractorFileStates, sonifierFileStates]) => {
    let dataFile = dataFiles[action.payload.fileId];
    let actions : Action[] = [];

    if(dataFile.type == DataFileType.IMAGE) {
      let sonifierState = sonifierFileStates[dataFile.id];
      let sourceExtractorState = sourceExtractorFileStates[dataFile.id];
      //add effects for image file selection
      let imageFile = dataFile as ImageFile;
      if(sonifierState.regionHistoryInitialized) {
        actions.push(new sonifierActions.SetRegion({file: imageFile, region: {x: 0, y: 0, width: getWidth(imageFile), height: getHeight(imageFile)}, storeInHistory: true}));
      }

      //actions.push(new workbenchActions.UpdateSourceExtractorRegion({file: imageFile}));
      if(sourceExtractorState.regionOption == SourceExtractorRegionOption.ENTIRE_IMAGE) {
        
      }
      
    }
    return Observable.from(actions);
  });

  @Effect()
  viewportChanged$: Observable<Action> = this.actions$
  .ofType<sonifierActions.UpdateViewport>(sonifierActions.UPDATE_VIEWPORT)
  .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getSonifierGlobalState),
    this.store.select(fromCore.getSonifierFileStates),
    this.store.select(fromCore.getSourceExtractorFileStates)
  )
  .flatMap(([action, dataFiles, sonifierGlobalState, sonifierFileStates, sourceExtractorFileStates]) => {
    let imageFile = dataFiles[action.payload.file.id] as ImageFile;
    let sonifierFileState = sonifierFileStates[imageFile.id];
    let actions : Action[] = [];

    if(sonifierFileState.regionOption == SonifierRegionOption.VIEWPORT) {
      actions.push(new sonifierActions.SetRegion({
        file: imageFile,
        storeInHistory: false,
        region: {
          x: action.payload.viewport.imageX,
          y: action.payload.viewport.imageY,
          width: action.payload.viewport.imageWidth,
          height: action.payload.viewport.imageHeight
        }
      }));
    }


    return Observable.from(actions);
  });


  

  @Effect()
  sonifierRegionChanged$: Observable<Action> = this.actions$
    .ofType<sonifierActions.SetRegion
      | sonifierActions.UndoRegionSelection
      | sonifierActions.RedoRegionSelection>(
        sonifierActions.SET_REGION,
        sonifierActions.UNDO_REGION_SELECTION,
        sonifierActions.REDO_REGION_SELECTION)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getSonifierGlobalState),
      this.store.select(fromCore.getSonifierFileStates),
      this.store.select(fromCore.getSourceExtractorFileStates)
    )
    .flatMap(([action, dataFiles, sonifierGlobalState, sonifierFileStates, sourceExtractorFileStates]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      let actions : Action[] = [];
      let sonifier = sonifierFileStates[imageFile.id];
      let sourceExtractor = sourceExtractorFileStates[imageFile.id];
      let viewport = sonifierGlobalState.viewport;

      if(sonifier.regionOption == SonifierRegionOption.CUSTOM && sonifier.viewportSync && sonifier.region && viewport) {
        actions.push(new viewerActions.CenterRegionInViewport({
          file: imageFile,
          region: sonifier.region,
          viewportSize: {
            width: viewport.viewportWidth,
            height: viewport.viewportHeight
          }}));
      }

      if(sourceExtractor.regionOption == SourceExtractorRegionOption.SONIFIER_REGION) actions.push(new sourceExtractorActions.UpdateRegion({file: imageFile}));

      return Observable.from(actions);
  });


  @Effect()
  updateSonifierUri$: Observable<Action> = this.actions$
    .ofType<sonifierActions.SetRegion
    | sonifierActions.UndoRegionSelection
    | sonifierActions.RedoRegionSelection
    | sonifierActions.UpdateFileState>(
    sonifierActions.SET_REGION,
    sonifierActions.UNDO_REGION_SELECTION,
    sonifierActions.REDO_REGION_SELECTION,
    sonifierActions.UPDATE_FILE_STATE)
    .withLatestFrom(
      this.store.select(fromCore.getSonifierFileStates)
    )
    .flatMap(([action,sonifierFileStates]) => {
      let actions : Action[] = [];
      let sonifier = sonifierFileStates[action.payload.file.id];
      if(sonifier.region) {
        let sonificationUri = this.afterglowDataFileService.getSonificationUri(
          action.payload.file.id,
          sonifier.region,
          sonifier.duration,
          sonifier.toneCount
        )
        actions.push(new sonifierActions.UpdateSonificationUri({file: action.payload.file, uri: sonificationUri}));
      }
      return Observable.from(actions);
  });

 


  constructor(
    private actions$: Actions,
    private afterglowDataFileService: AfterglowDataFileService,
    private store: Store<fromDataFile.State>
    // @Optional()
    // @Inject(SEARCH_DEBOUNCE)
    // private debounce: number,
    // /**
    //    * You inject an optional Scheduler that will be undefined
    //    * in normal application usage, but its injected here so that you can mock out
    //    * during testing using the RxJS TestScheduler for simulating passages of time.
    //    */
    // @Optional()
    // @Inject(SEARCH_SCHEDULER)
    // private scheduler: Scheduler
  ) {}
}

