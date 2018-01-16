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

import { AfterglowDataFileService } from '../../core/services/afterglow-data-files';
import * as fromDataFile from '../reducers';
import * as dataFileActions from '../actions/data-file';
import * as imageFileActions from '../actions/image-file';
import { DataFile, ImageFile, Header, getWidth, getHeight } from '../models/data-file';
import { DataFileType } from '../models/data-file-type';
import { ImageHist } from '../models/image-hist';

// export const SEARCH_DEBOUNCE = new InjectionToken<number>('Search Debounce');
// export const SEARCH_SCHEDULER = new InjectionToken<Scheduler>(
//   'Search Scheduler'
// );


@Injectable()
export class DataFileEffects {
  @Effect()
  loadLibrary$: Observable<Action> = this.actions$
    .ofType<dataFileActions.LoadLibrary>(dataFileActions.LOAD_LIBRARY)
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .switchMap(action => {
      
      const nextReq$ = this.actions$.ofType(dataFileActions.LOAD_LIBRARY).skip(1);

      return this.afterglowDataFileService
        .getFiles()
        .takeUntil(nextReq$)
        .map((dataFiles: DataFile[]) => new dataFileActions.LoadLibrarySuccess(dataFiles))
        .catch(err => of(new dataFileActions.LoadLibraryFail(err)));
    });

    @Effect()
    removeAllDataFiles$: Observable<Action> = this.actions$
      .ofType<dataFileActions.RemoveAllDataFiles>(dataFileActions.REMOVE_ALL_DATA_FILES)
      .withLatestFrom(this.store.select(fromDataFile.getAllDataFiles))
      .switchMap(([action, dataFiles]) => {
        return Observable.forkJoin(dataFiles.map(dataFile => {
          return this.afterglowDataFileService
          .removeFile(dataFile.id);
        }))
        .map(() => new dataFileActions.RemoveDataFileSuccess())
        .catch(err => of(new dataFileActions.RemoveDataFileFail(err)))
    });

    @Effect()
    removeDataFile$: Observable<Action> = this.actions$
      .ofType<dataFileActions.RemoveDataFile>(dataFileActions.REMOVE_DATA_FILE)
      //.debounceTime(this.debounce || 300, this.scheduler || async)
      .flatMap(action => {
        return this.afterglowDataFileService
          .removeFile(action.payload.file.id)
          .map((dataFiles: DataFile[]) => new dataFileActions.RemoveDataFileSuccess())
          .catch(err => of(new dataFileActions.RemoveDataFileFail(err)));
    });

    @Effect()
    removeDataFileSuccess$: Observable<Action> = this.actions$
      .ofType<dataFileActions.RemoveDataFileSuccess>(dataFileActions.REMOVE_DATA_FILE_SUCCESS)
      //.debounceTime(this.debounce || 300, this.scheduler || async)
      .flatMap(action => {
        return Observable.from([new dataFileActions.LoadLibrary()]);
    });

    @Effect()
    loadDataFileHdr$: Observable<Action> = this.actions$
      .ofType<dataFileActions.LoadDataFileHdr>(dataFileActions.LOAD_DATA_FILE_HDR)
      //.debounceTime(this.debounce || 300, this.scheduler || async)
      .flatMap(action => {
        const nextReq$ = this.actions$.ofType(dataFileActions.LOAD_DATA_FILE_HDR).skip(1);

        return this.afterglowDataFileService
          .getHeader(action.payload.id)
          .takeUntil(nextReq$)
          .map((hdr: Header) => new dataFileActions.LoadDataFileHdrSuccess({fileId: action.payload.id, header: hdr}))
          .catch(err => of(new dataFileActions.LoadDataFileHdrFail({fileId: action.payload.id, error: err})));
    });

    @Effect()
    loadDataFileHdrSuccess$: Observable<Action> = this.actions$
      .ofType<dataFileActions.LoadDataFileHdrSuccess>(dataFileActions.LOAD_DATA_FILE_HDR_SUCCESS)
      .withLatestFrom(this.store.select(fromDataFile.getDataFileEntities))
      .flatMap(([action, dataFiles]) => {
        let dataFile = dataFiles[action.payload.fileId];
        let actions : Action[] = [];

        if(dataFile.type == DataFileType.IMAGE) {
          //add effects for image file selection
          let imageFile = dataFile as ImageFile;
          if(!imageFile.tilesInitialized) actions.push(new imageFileActions.InitImageTiles({file: imageFile}));
          
        }
        return Observable.from(actions);
    });

    @Effect()
    loadImageFileHist$: Observable<Action> = this.actions$
      .ofType<imageFileActions.LoadImageHist>(imageFileActions.LOAD_IMAGE_HIST)
      //.debounceTime(this.debounce || 300, this.scheduler || async)
      .flatMap(action => {
        const nextReq$ = this.actions$.ofType(imageFileActions.LOAD_IMAGE_HIST).skip(1);

        return this.afterglowDataFileService
          .getHist(action.payload.file.id)
          .takeUntil(nextReq$)
          .map((hist: ImageHist) => new imageFileActions.LoadImageHistSuccess({fileId: action.payload.file.id, hist: hist}))
          .catch(err => of(new imageFileActions.LoadImageHistFail({fileId: action.payload.file.id, error: err})));
    });

    
    @Effect()
    loadImageTilePixels$: Observable<Action> = this.actions$
      .ofType<imageFileActions.LoadImageTilePixels>(imageFileActions.LOAD_IMAGE_TILE_PIXELS)
      .flatMap(action => {
        //const nextReq$ = this.actions$.ofType(imageFileActions.LOAD_IMAGE_TILE_PIXELS).skip(1);
        return this.afterglowDataFileService
          .getPixels(action.payload.file.id, action.payload.tile)
          //.takeUntil(nextReq$)
          .map((pixels: Float32Array) => new imageFileActions.LoadImageTilePixelsSuccess({
            fileId: action.payload.file.id,
            tileIndex: action.payload.tile.index,
            pixels: pixels
          }))
          .catch(err => of(new imageFileActions.LoadImageTilePixelsFail({
            fileId: action.payload.file.id,
            tileIndex: action.payload.tile.index,
            error: err
          })));
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