









import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { Effect, Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, merge, of } from 'rxjs';
import { map, catchError, switchMap, takeUntil, withLatestFrom, skip } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { AfterglowDataProviderService } from '../../core/services/afterglow-data-providers';
import * as fromDataProviders from '../reducers';
import * as dataProviderActions from '../actions/data-provider';
import * as dataFileActions from '../../data-files/actions/data-file';
import { DataProvider } from '../models/data-provider';
import { DataProviderAsset } from '../models/data-provider-asset';
import { AfterglowDataFileService } from '../../core/services/afterglow-data-files';
import { HttpErrorResponse } from '@angular/common/http/src/response';


@Injectable()
export class DataProviderEffects {
  @Effect()
  loadDataProviders$: Observable<Action> = this.actions$
    .ofType<dataProviderActions.LoadDataProviders>(dataProviderActions.LOAD_DATA_PROVIDERS)
    .pipe(
      switchMap(action => {

        const nextReq$ = this.actions$.ofType(dataProviderActions.LOAD_DATA_PROVIDERS).pipe(skip(1));
  
        return this.afterglowDataProviderService
          .getDataProviders()
          .pipe(
            takeUntil(nextReq$),
            map((dataProviders: DataProvider[]) => new dataProviderActions.LoadDataProvidersSuccess(dataProviders)),
            catchError(err => of(new dataProviderActions.LoadDataProvidersFail(err)))
          )
      })
    )
    //.debounceTime(this.debounce || 300, this.scheduler || async)

  @Effect()
  loadDataProviderAssets$: Observable<Action> = this.actions$
    .ofType<dataProviderActions.LoadDataProviderAssets>(dataProviderActions.LOAD_DATA_PROVIDER_ASSETS)
    .pipe(
      switchMap(action => {
        const nextReq$ = this.actions$.ofType(dataProviderActions.LOAD_DATA_PROVIDER_ASSETS).pipe(skip(1));
        return this.afterglowDataProviderService
          .getAssets(action.payload.dataProvider.id, action.payload.path)
          .pipe(
            takeUntil(nextReq$),
            map((dataProviderAssets: DataProviderAsset[]) => new dataProviderActions.LoadDataProviderAssetsSuccess({
              dataProvider: action.payload.dataProvider,
              path: action.payload.path,
              assets: dataProviderAssets
            })),
            catchError(err => of(new dataProviderActions.LoadDataProviderAssetsFail(err)))
          )
      })
    )
    //.debounceTime(this.debounce || 300, this.scheduler || async)

  @Effect()
  loadDataProviderAssetsSuccess$: Observable<Action> = this.actions$
    .ofType<dataProviderActions.LoadDataProviderAssetsSuccess>(dataProviderActions.LOAD_DATA_PROVIDER_ASSETS_SUCCESS)
    .pipe(
      map(action => new dataProviderActions.SortDataProviderAssets())
    )
    //.debounceTime(this.debounce || 300, this.scheduler || async)

  @Effect()
  importSelectedAssets$: Observable<Action> = this.actions$
    .ofType<dataProviderActions.ImportSelectedAssets>(dataProviderActions.IMPORT_SELECTED_ASSETS)
    .pipe(
      withLatestFrom(this.store.select(fromDataProviders.getDataProvidersState)),
      switchMap(([action, state]) => {
        return merge(...state.pendingImports.map(asset => {
          return this.afterglowDataFileService
            .createFromDataProviderAsset(state.currentProvider, asset)
            .pipe(
              map(() => new dataProviderActions.ImportAssetSuccess({ asset: asset })),
              catchError(err => {
                return of(new dataProviderActions.ImportAssetFail({ error: (err as HttpErrorResponse).error.message, asset: asset }))
              })
            )
        }))
      })
    )

    @Effect()
  importAssets$: Observable<Action> = this.actions$
    .ofType<dataProviderActions.ImportAssets>(dataProviderActions.IMPORT_ASSETS)
    .pipe(
      withLatestFrom(this.store.select(fromDataProviders.getDataProvidersState)),
      switchMap(([action, state]) => {
        return merge(...state.pendingImports.map(asset => {
          return this.afterglowDataFileService
            .createFromDataProviderAsset(state.currentProvider, asset)
            .pipe(
              map(() => new dataProviderActions.ImportAssetSuccess({ asset: asset })),
              catchError(err => {
                return of(new dataProviderActions.ImportAssetFail({ error: (err as HttpErrorResponse).error.message, asset: asset }))
              })
            )
        }))
      })
    )

  // @Effect()
  // importSelectedAssetsSuccess$: Observable<Action> = this.actions$
  //   .ofType<dataProviderActions.ImportAssetSuccess>(dataProviderActions.IMPORT_ASSET_SUCCESS)
  //   //.debounceTime(this.debounce || 300, this.scheduler || async)
  //   .flatMap(action => {
  //     this.router.navigate(['/workbench']);
  //     return Observable.from([new dataFileActions.LoadLibrary()]);
  //   });



  constructor(
    private actions$: Actions,
    private afterglowDataProviderService: AfterglowDataProviderService,
    private afterglowDataFileService: AfterglowDataFileService,
    private store: Store<fromDataProviders.State>,
    private router: Router
  ) { }
}