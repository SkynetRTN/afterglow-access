import { Injectable, InjectionToken, Optional, Inject } from "@angular/core";
import { Effect, Actions } from "@ngrx/effects";
import { Action } from "@ngrx/store";
import { Observable, of, from, merge } from "rxjs";
import {
  takeUntil,
  switchMap,
  catchError,
  map,
  skip,
  withLatestFrom,
  flatMap,
  filter,
  race,
  take
} from "rxjs/operators";
import { Store } from "@ngrx/store";
import { Point } from "paper";

import { AfterglowDataFileService } from "../../core/services/afterglow-data-files";
import {
  DataFile,
  ImageFile,
  Header,
  getWidth,
  getHeight
} from "../models/data-file";
import { DataFileType } from "../models/data-file-type";
import { ImageHist } from "../models/image-hist";

import * as fromDataFile from "../reducers";
import * as dataFileActions from "../actions/data-file";
import * as imageFileActions from "../actions/image-file";

// export const SEARCH_DEBOUNCE = new InjectionToken<number>('Search Debounce');
// export const SEARCH_SCHEDULER = new InjectionToken<Scheduler>(
//   'Search Scheduler'
// );

@Injectable()
export class DataFileEffects {
  @Effect()
  loadLibrary$: Observable<Action> = this.actions$
    .ofType<dataFileActions.LoadLibrary>(dataFileActions.LOAD_LIBRARY)
    .pipe(
      switchMap(action => {
        const nextReq$ = this.actions$
          .ofType(dataFileActions.LOAD_LIBRARY)
          .pipe(skip(1));

        return this.afterglowDataFileService.getFiles().pipe(
          takeUntil(nextReq$),
          map(
            (dataFiles: DataFile[]) =>
              new dataFileActions.LoadLibrarySuccess(dataFiles)
          ),
          catchError(err => of(new dataFileActions.LoadLibraryFail(err)))
        );
      })
    );
  //.debounceTime(this.debounce || 300, this.scheduler || async)

  @Effect()
  removeAllDataFiles$: Observable<Action> = this.actions$
    .ofType<dataFileActions.RemoveAllDataFiles>(
      dataFileActions.REMOVE_ALL_DATA_FILES
    )
    .pipe(
      withLatestFrom(this.store.select(fromDataFile.getAllDataFiles)),
      flatMap(([action, dataFiles]) => {
        return from(
          dataFiles.map(
            dataFile => new dataFileActions.RemoveDataFile({ file: dataFile })
          )
        );
      })
    );

  @Effect()
  removeDataFile$: Observable<Action> = this.actions$
    .ofType<dataFileActions.RemoveDataFile>(dataFileActions.REMOVE_DATA_FILE)
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .pipe(
      flatMap(action => {
        return this.afterglowDataFileService
          .removeFile(action.payload.file.id)
          .pipe(
            map(
              (dataFiles: DataFile[]) =>
                new dataFileActions.RemoveDataFileSuccess({
                  file: action.payload.file
                })
            ),
            catchError(err => of(new dataFileActions.RemoveDataFileFail(err)))
          );
      })
    );

  @Effect()
  removeDataFileSuccess$: Observable<Action> = this.actions$
    .ofType<dataFileActions.RemoveDataFileSuccess>(
      dataFileActions.REMOVE_DATA_FILE_SUCCESS
    )
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .pipe(
      flatMap(action => {
        return from([new dataFileActions.LoadLibrary()]);
      })
    );

  @Effect()
  loadDataFileHdr$: Observable<Action> = this.actions$
    .ofType<dataFileActions.LoadDataFileHdr>(dataFileActions.LOAD_DATA_FILE_HDR)
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .pipe(
      flatMap(action => {
        let cancel$ = merge(
          this.actions$
            .ofType<dataFileActions.RemoveDataFile>(
              dataFileActions.REMOVE_DATA_FILE
            )
            .pipe(
              filter(
                cancelAction =>
                  cancelAction.payload.file.id == action.payload.file.id
              )
            ),
          this.actions$
            .ofType<dataFileActions.LoadDataFileHdr>(
              dataFileActions.LOAD_DATA_FILE_HDR
            )
            .pipe(
              filter(
                cancelAction =>
                  cancelAction.payload.file.id != action.payload.file.id
              )
            )
        );

        return this.afterglowDataFileService
          .getHeader(action.payload.file.id)
          .pipe(
            map(
              (hdr: Header) =>
                new dataFileActions.LoadDataFileHdrSuccess({
                  file: action.payload.file,
                  header: hdr
                })
            ),
            catchError(err =>
              of(
                new dataFileActions.LoadDataFileHdrFail({
                  file: action.payload.file,
                  error: err
                })
              )
            ),
            race(
              cancel$.pipe(
                map(
                  cancelAction =>
                    new dataFileActions.LoadDataFileHdrFail({
                      file: action.payload.file,
                      error: "Cancelled"
                    })
                ),
                take(1)
              )
            )
          );
      })
    );

  @Effect()
  loadDataFileHdrSuccess$: Observable<Action> = this.actions$
    .ofType<dataFileActions.LoadDataFileHdrSuccess>(
      dataFileActions.LOAD_DATA_FILE_HDR_SUCCESS
    )
    .pipe(
      withLatestFrom(this.store.select(fromDataFile.getDataFiles)),
      flatMap(([action, dataFiles]) => {
        let dataFile = dataFiles[action.payload.file.id];
        let actions: Action[] = [];

        if (dataFile.type == DataFileType.IMAGE) {
          //add effects for image file selection
          let imageFile = dataFile as ImageFile;
          if (!imageFile.tilesInitialized)
            actions.push(
              new imageFileActions.InitImageTiles({ file: imageFile })
            );
        }
        return from(actions);
      })
    );

  @Effect()
  loadImageFileHist$: Observable<Action> = this.actions$
    .ofType<imageFileActions.LoadImageHist>(imageFileActions.LOAD_IMAGE_HIST)
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .pipe(
      flatMap(action => {
        let cancel$ = merge(
          this.actions$
            .ofType<dataFileActions.RemoveDataFile>(
              dataFileActions.REMOVE_DATA_FILE
            )
            .pipe(
              filter(
                cancelAction =>
                  cancelAction.payload.file.id == action.payload.file.id
              )
            ),
          this.actions$
            .ofType<
              imageFileActions.LoadImageHist | dataFileActions.LoadDataFileHdr
            >(
              imageFileActions.LOAD_IMAGE_HIST,
              dataFileActions.LOAD_DATA_FILE_HDR
            )
            .pipe(
              filter(
                cancelAction =>
                  cancelAction.payload.file.id != action.payload.file.id
              )
            )
        );

        return this.afterglowDataFileService
          .getHist(action.payload.file.id)
          .pipe(
            map(
              (hist: ImageHist) =>
                new imageFileActions.LoadImageHistSuccess({
                  file: action.payload.file,
                  hist: hist
                })
            ),
            catchError(err =>
              of(
                new imageFileActions.LoadImageHistFail({
                  file: action.payload.file,
                  error: err
                })
              )
            ),
            race(
              cancel$.pipe(
                map(
                  cancelAction =>
                    new imageFileActions.LoadImageHistFail({
                      file: action.payload.file,
                      error: "Cancelled"
                    })
                ),
                take(1)
              )
            )
          );
      })
    );

  @Effect()
  loadImageTilePixels$: Observable<Action> = this.actions$
    .ofType<imageFileActions.LoadImageTilePixels>(
      imageFileActions.LOAD_IMAGE_TILE_PIXELS
    )
    .pipe(
      flatMap(action => {
        let cancel$ = merge(
          this.actions$
            .ofType<dataFileActions.RemoveDataFile>(
              dataFileActions.REMOVE_DATA_FILE
            )
            .pipe(
              filter(
                cancelAction =>
                  cancelAction.payload.file.id == action.payload.file.id
              )
            )

          // this.actions$
          //   .ofType<imageFileActions.LoadImageTilePixels | dataFileActions.LoadDataFileHdr | imageFileActions.LoadImageHist>(
          //     imageFileActions.LOAD_IMAGE_TILE_PIXELS,
          //     dataFileActions.LOAD_DATA_FILE_HDR,
          //     imageFileActions.LOAD_IMAGE_HIST
          //   )
          //   .filter(cancelAction => cancelAction.payload.file.id != action.payload.file.id)
        );

        return this.afterglowDataFileService
          .getPixels(action.payload.file.id, action.payload.tile)
          .pipe(
            map(
              (pixels: Float32Array) =>
                new imageFileActions.LoadImageTilePixelsSuccess({
                  file: action.payload.file,
                  tileIndex: action.payload.tile.index,
                  pixels: pixels
                })
            ),
            catchError(err =>
              of(
                new imageFileActions.LoadImageTilePixelsFail({
                  file: action.payload.file,
                  tileIndex: action.payload.tile.index,
                  error: err
                })
              )
            ),
            race(
              cancel$.pipe(
                map(
                  cancelAction =>
                    new imageFileActions.LoadImageTilePixelsFail({
                      file: action.payload.file,
                      tileIndex: action.payload.tile.index,
                      error: 'canceled'
                    })
                ),
                take(1)
              )
            )
          );
      })
    );

  constructor(
    private actions$: Actions,
    private afterglowDataFileService: AfterglowDataFileService,
    private store: Store<fromDataFile.State> // @Optional() // @Inject(SEARCH_DEBOUNCE) // private debounce: number, // /** //    * You inject an optional Scheduler that will be undefined //    * in normal application usage, but its injected here so that you can mock out
  ) //    * during testing using the RxJS TestScheduler for simulating passages of time.
  //    */
  // @Optional()
  // @Inject(SEARCH_SCHEDULER)
  // private scheduler: Scheduler
  {}
}
