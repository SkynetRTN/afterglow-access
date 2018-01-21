import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/skip';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/withLatestFrom';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/forkJoin';
import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { Effect, Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { Scheduler } from 'rxjs/Scheduler';
import { async } from 'rxjs/scheduler/async';
import { empty } from 'rxjs/observable/empty';
import { of } from 'rxjs/observable/of';
import { Store } from '@ngrx/store';
import { Point } from 'paper';

import * as fromDataFile from '../../data-files/reducers';
import { DataFile, ImageFile, Header, getWidth, getHeight } from '../../data-files/models/data-file';
import { DataFileType } from '../../data-files/models/data-file-type';
import { ImageHist } from '../../data-files/models/image-hist';
import {  SourceExtractorRegionOption } from '../models/source-extractor-file-state';

import * as fromCore from '../reducers'
import * as workbenchActions from '../actions/workbench';
import * as sonifierActions from '../actions/sonifier';
import * as viewerActions from '../actions/viewer';
import * as dataFileActions from '../../data-files/actions/data-file';
import * as imageFileActions from '../../data-files/actions/image-file';
import { AfterglowDataFileService } from '../services/afterglow-data-files';
import { getScale, ViewerFileState } from '../models/viewer-file-state';
import { normalize } from '../models/pixel-normalizer';

import { Source } from '../models/source';

// export const SEARCH_DEBOUNCE = new InjectionToken<number>('Search Debounce');
// export const SEARCH_SCHEDULER = new InjectionToken<Scheduler>(
//   'Search Scheduler'
// );


@Injectable()
export class WorkbenchEffects {

  @Effect()
  loadLibrarySuccess$: Observable<Action> = this.actions$
    .ofType<dataFileActions.LoadLibrarySuccess>(dataFileActions.LOAD_LIBRARY_SUCCESS)
    .withLatestFrom(this.store.select(fromDataFile.getAllDataFiles), this.store.select(fromCore.getWorkbenchGlobalState))
    .switchMap(([action, dataFiles, workbenchGlobalState]) => {
      let actions : Action[] = [];
      let curentDataFile = dataFiles.find(dataFile => dataFile.id == workbenchGlobalState.selectedDataFileId);
      if(dataFiles.length != 0) {
        if(workbenchGlobalState.selectedDataFileId == null || !curentDataFile) {
          actions.push(new workbenchActions.SelectDataFile(dataFiles[0].id));
        }
      }
      return Observable.from(actions);
  });

  @Effect()
  dataFileRemoved$: Observable<Action> = this.actions$
    .ofType<dataFileActions.RemoveDataFileSuccess>(dataFileActions.REMOVE_DATA_FILE_SUCCESS)
    .withLatestFrom(this.store.select(fromDataFile.getAllDataFiles), this.store.select(fromCore.getWorkbenchGlobalState))
    .switchMap(([action, dataFiles, workbenchGlobalState]) => {
      let actions : Action[] = [];

      if(workbenchGlobalState.selectedDataFileId != null) {
        let newSelectedDataFileId = null;
        if(dataFiles.length != 1) {
          let selectedDataFile = dataFiles.find(dataFile => dataFile.id ==  workbenchGlobalState.selectedDataFileId)
          let currentIndex = dataFiles.indexOf(selectedDataFile);
          newSelectedDataFileId = dataFiles[Math.min(dataFiles.length-1, currentIndex+1)].id;
        }
        actions.push(new workbenchActions.SelectDataFile(newSelectedDataFileId));
      }
      
      
      return Observable.from(actions);
  });
  
  @Effect()
  dataFileSelected$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SelectDataFile>(workbenchActions.SELECT_DATA_FILE)
    .withLatestFrom(this.store.select(fromDataFile.getDataFiles))
    .switchMap(([action, dataFiles]) => {
      let actions : Action[] = [];
      if(action.payload != null) {
        let dataFile = dataFiles[action.payload];
        if(!dataFile.headerLoaded && !dataFile.headerLoading) actions.push(new dataFileActions.LoadDataFileHdr(dataFile));
      }
      return Observable.from(actions);
  });

  
  @Effect()
  headerLoaded$: Observable<Action> = this.actions$
    .ofType<dataFileActions.LoadDataFileHdrSuccess>(dataFileActions.LOAD_DATA_FILE_HDR_SUCCESS)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getSonifierGlobalState),
      this.store.select(fromCore.getSourceExtractorGlobalState)
    )
    .flatMap(([action, dataFiles, sonifierStateGlobal, sourceExtractorStateGlobal]) => {
      let dataFile = dataFiles[action.payload.fileId];
      let actions : Action[] = [];

      if(dataFile.type == DataFileType.IMAGE) {
        //add effects for image file selection
        let imageFile = dataFile as ImageFile;

        //if histogram not loaded,  load now
        if(!imageFile.histLoaded && !imageFile.histLoading) actions.push(new imageFileActions.LoadImageHist({file: imageFile}));

        let sonifierState = sonifierStateGlobal.entities[imageFile.id];
        
        if(!sonifierState.regionHistoryInitialized) {
          actions.push(new sonifierActions.AddRegionToHistory({file: imageFile, region: {x: 0, y: 0, width: getWidth(imageFile), height: getHeight(imageFile)}}));
        }

        let sourceExtractorState = sourceExtractorStateGlobal.entities[imageFile.id];
        //actions.push(new workbenchActions.UpdateSourceExtractorRegion({file: imageFile}));
        if(sourceExtractorState.regionOption == SourceExtractorRegionOption.ENTIRE_IMAGE) {
          
        }
        
      }
      return Observable.from(actions);
  });

 
  
  

  // @Effect()
  // sourceExtractorFileStateUpdated$: Observable<Action> = this.actions$
  //   .ofType<workbenchActions.UpdateSourceExtractorFileState>(workbenchActions.UPDATE_SOURCE_EXTRACTOR_FILE_STATE)
  //   .withLatestFrom(this.store.select(fromDataFile.getDataFiles))
  //   .switchMap(([action, dataFiles]) => {
  //     let imageFile = dataFiles[action.payload.file.id] as ImageFile;
  //     return Observable.from([new workbenchActions.UpdateSourceExtractorRegion({file: imageFile})]);
  // });

  

  // @Effect()
  // sourceFilterChanged$: Observable<Action> = this.actions$
  //   .ofType<workbenchActions.ExtractSourcesSuccess |
  //     workbenchActions.UpdateSourceExtractorRegion>(
  //     workbenchActions.EXTRACT_SOURCES_SUCCESS,
  //     workbenchActions.UPDATE_SOURCE_EXTRACTOR_REGION
  //   )
  //   .debounceTime(100)
  //   .withLatestFrom(
  //     this.store.select(fromDataFile.getDataFiles)
  //   )
  //   //.debounceTime(this.debounce || 300, this.scheduler || async)
  //   .switchMap(([action, dataFiles]) => {
  //     let imageFile = dataFiles[action.payload.file.id] as ImageFile;
  //     return Observable.from([new workbenchActions.UpdateFilteredSources({file: action.payload.file})]);
  // });

 


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