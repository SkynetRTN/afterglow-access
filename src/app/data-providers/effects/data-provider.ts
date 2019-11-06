import { Injectable, InjectionToken, Optional, Inject } from "@angular/core";
import { Effect, Actions, ofType } from "@ngrx/effects";
import { Action } from "@ngrx/store";
import { Observable, merge, of } from "rxjs";
import {
  map,
  flatMap,
  catchError,
  switchMap,
  takeUntil,
  withLatestFrom,
  filter,
  skip,
  tap
} from "rxjs/operators";
import { Store } from "@ngrx/store";
import { ActivatedRoute, Params, Router } from "@angular/router";

import { AfterglowDataProviderService } from "../../core/services/afterglow-data-providers";
import * as fromDataProviders from "../reducers";
import * as dataProviderActions from "../actions/data-provider";
import * as dataFileActions from "../../data-files/actions/data-file";
import * as jobActions from "../../jobs/actions/job";
import { DataProvider } from "../models/data-provider";
import { DataProviderAsset } from "../models/data-provider-asset";
import { AfterglowDataFileService } from "../../core/services/afterglow-data-files";
import { HttpErrorResponse } from '@angular/common/http';
import { BatchImportJob, BatchImportSettings, BatchImportJobResult } from '../../jobs/models/batch-import';
import { JobType } from '../../jobs/models/job-types';

@Injectable()
export class DataProviderEffects {
  @Effect()
  loadDataProviders$: Observable<Action> = this.actions$.pipe(
    ofType<dataProviderActions.LoadDataProviders>(
      dataProviderActions.LOAD_DATA_PROVIDERS
    ),
    switchMap(action => {
      const nextReq$ = this.actions$.pipe(
        ofType(dataProviderActions.LOAD_DATA_PROVIDERS),
        skip(1)
      );

      return this.afterglowDataProviderService.getDataProviders().pipe(
        takeUntil(nextReq$),
        map(
          (dataProviders: DataProvider[]) =>
            new dataProviderActions.LoadDataProvidersSuccess(dataProviders)
        ),
        catchError(err =>
          of(new dataProviderActions.LoadDataProvidersFail(err))
        )
      );
    })
  );
  //.debounceTime(this.debounce || 300, this.scheduler || async)

  @Effect()
  loadDataProviderAssets$: Observable<Action> = this.actions$.pipe(
    ofType<dataProviderActions.LoadDataProviderAssets>(
      dataProviderActions.LOAD_DATA_PROVIDER_ASSETS
    ),
    switchMap(action => {
      const nextReq$ = this.actions$.pipe(
        ofType(dataProviderActions.LOAD_DATA_PROVIDER_ASSETS),
        skip(1)
      );
      return this.afterglowDataProviderService
        .getAssets(action.payload.dataProvider.id, action.payload.path)
        .pipe(
          takeUntil(nextReq$),
          map(
            (dataProviderAssets: DataProviderAsset[]) =>
              new dataProviderActions.LoadDataProviderAssetsSuccess({
                dataProvider: action.payload.dataProvider,
                path: action.payload.path,
                assets: dataProviderAssets
              })
          ),
          catchError(err =>
            of(new dataProviderActions.LoadDataProviderAssetsFail(err))
          )
        );
    })
  );
  //.debounceTime(this.debounce || 300, this.scheduler || async)

  @Effect()
  loadDataProviderAssetsSuccess$: Observable<Action> = this.actions$.pipe(
    ofType<dataProviderActions.LoadDataProviderAssetsSuccess>(
      dataProviderActions.LOAD_DATA_PROVIDER_ASSETS_SUCCESS
    ),
    map(action => new dataProviderActions.SortDataProviderAssets())
  );
  //.debounceTime(this.debounce || 300, this.scheduler || async)


  /*Used by data provider browse page*/
  @Effect()
  importSelectedAssets$: Observable<Action> = this.actions$.pipe(
    ofType<dataProviderActions.ImportSelectedAssets>(
      dataProviderActions.IMPORT_SELECTED_ASSETS
    ),
    withLatestFrom(this.store.select(fromDataProviders.getDataProvidersState)),
    switchMap(([action, state]) => {
      return of(new dataProviderActions.ImportAssets({
        dataProviderId: action.payload.dataProviderId,
        assets: action.payload.assets
      }, state.batchImportCorrId))
    })
  );

  @Effect()
  importSelectedAssetsSuccess$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.UpdateJobResultSuccess>(
      jobActions.UPDATE_JOB_RESULT_SUCCESS
    ),
    withLatestFrom(this.store.select(fromDataProviders.getDataProvidersState)),
    filter(([action, state]) => {
      let result = (action.payload.result as BatchImportJobResult);
      return state.batchImportCorrId !== null && action.correlationId == state.batchImportCorrId && result.errors.length == 0 && result.file_ids.length != 0
    }),
    flatMap(([action, state]) => {
      console.log(action, state);
      return of(new dataProviderActions.ImportSelectedAssetsSuccess({
        fileIds: (action.payload.result as BatchImportJobResult).file_ids.map(id => id.toString())
      }, action.correlationId))
    })
  );

  /*Used anywhere in app when an asset needs to be imported*/
  @Effect()
  importAssets$: Observable<Action> = this.actions$.pipe(
    ofType<dataProviderActions.ImportAssets>(dataProviderActions.IMPORT_ASSETS),
    withLatestFrom(this.store.select(fromDataProviders.getDataProvidersState)),
    flatMap(([action, state]) => {
      let a: dataProviderActions.ImportAssets = action;
      let job: BatchImportJob = {
        id: null,
        type: JobType.BatchImport,
        settings: a.payload.assets.map(
          asset => {
            return {
              provider_id: parseInt(action.payload.dataProviderId),
              path: asset.path,
              recurse: false
            } as BatchImportSettings
          })
      };

      return of(new jobActions.CreateJob({ job: job }, action.correlationId))
    })

    // switchMap(([action, state]) => {
    //   return merge(
    //     ...state.pendingImports.map(asset => {
    //       return this.afterglowDataFileService
    //         .createFromDataProviderAsset(action.payload.dataProviderId, asset.path)
    //         .pipe(
    //           map(
    //             (resp: any) =>
    //               new dataProviderActions.ImportAssetSuccess({ asset: asset, fileId:  resp[0].id.toString() }, action.correlationId)
    //           ),
    //           catchError(err => {
    //             return of(
    //               new dataProviderActions.ImportAssetFail({
    //                 error: (err as HttpErrorResponse).error.message,
    //                 asset: asset
    //               }, action.correlationId)
    //             );
    //           })
    //         );
    //     })
    //   );
    // })
  );

  // @Effect()
  // importSelectedAssetsSuccess$: Observable<Action> = this.actions$.pipe(
  //   ofType<dataProviderActions.ImportAssetSuccess | dataProviderActions.ImportAssetFail>(dataProviderActions.IMPORT_ASSET_SUCCESS, dataProviderActions.IMPORT_ASSET_FAIL),
  //   withLatestFrom(this.store.select(fromDataProviders.getDataProvidersState)),
  //   filter(([action, state]) => state.pendingImports.length == 0),
  //   flatMap(([action, state]) => {
  //     this.router.navigate(['/workbench']);
  //     return of(new dataFileActions.LoadLibrary());
  //   })
  // );

  constructor(
    private actions$: Actions,
    private afterglowDataProviderService: AfterglowDataProviderService,
    private afterglowDataFileService: AfterglowDataFileService,
    private store: Store<fromDataProviders.State>,
    private router: Router
  ) { }
}
