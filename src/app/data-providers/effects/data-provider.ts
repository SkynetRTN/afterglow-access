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
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .switchMap(action => {

      const nextReq$ = this.actions$.ofType(dataProviderActions.LOAD_DATA_PROVIDERS).skip(1);

      return this.afterglowDataProviderService
        .getDataProviders()
        .takeUntil(nextReq$)
        .map((dataProviders: DataProvider[]) => new dataProviderActions.LoadDataProvidersSuccess(dataProviders))
        .catch(err => of(new dataProviderActions.LoadDataProvidersFail(err)));
    });

  @Effect()
  loadDataProviderAssets$: Observable<Action> = this.actions$
    .ofType<dataProviderActions.LoadDataProviderAssets>(dataProviderActions.LOAD_DATA_PROVIDER_ASSETS)
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .switchMap(action => {
      const nextReq$ = this.actions$.ofType(dataProviderActions.LOAD_DATA_PROVIDER_ASSETS).skip(1);
      return this.afterglowDataProviderService
        .getAssets(action.payload.dataProvider.id, action.payload.path)
        .takeUntil(nextReq$)
        .map((dataProviderAssets: DataProviderAsset[]) => new dataProviderActions.LoadDataProviderAssetsSuccess({
          dataProvider: action.payload.dataProvider,
          path: action.payload.path,
          assets: dataProviderAssets
        }))
        .catch(err => of(new dataProviderActions.LoadDataProviderAssetsFail(err)));
    });

  @Effect()
  loadDataProviderAssetsSuccess$: Observable<Action> = this.actions$
    .ofType<dataProviderActions.LoadDataProviderAssetsSuccess>(dataProviderActions.LOAD_DATA_PROVIDER_ASSETS_SUCCESS)
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .map(action => new dataProviderActions.SortDataProviderAssets());

  @Effect()
  importSelectedAssets$: Observable<Action> = this.actions$
    .ofType<dataProviderActions.ImportSelectedAssets>(dataProviderActions.IMPORT_SELECTED_ASSETS)
    .withLatestFrom(this.store.select(fromDataProviders.getDataProvidersState))
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .switchMap(([action, state]) => {
      return Observable.merge(...state.pendingImports.map(asset => {
        return this.afterglowDataFileService
          .createFromDataProviderAsset(state.currentProvider, asset)
          .map(() => new dataProviderActions.ImportAssetSuccess({ asset: asset }))
          .catch(err => {
            return of(new dataProviderActions.ImportAssetFail({ error: (err as HttpErrorResponse).error.message, asset: asset }))
          })
      }))
    });

    @Effect()
  importAssets$: Observable<Action> = this.actions$
    .ofType<dataProviderActions.ImportAssets>(dataProviderActions.IMPORT_ASSETS)
    .withLatestFrom(this.store.select(fromDataProviders.getDataProvidersState))
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .switchMap(([action, state]) => {
      return Observable.merge(...state.pendingImports.map(asset => {
        return this.afterglowDataFileService
          .createFromDataProviderAsset(state.currentProvider, asset)
          .map(() => new dataProviderActions.ImportAssetSuccess({ asset: asset }))
          .catch(err => {
            return of(new dataProviderActions.ImportAssetFail({ error: (err as HttpErrorResponse).error.message, asset: asset }))
          })
      }))
    });

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