import {
  State,
  Action,
  Selector,
  StateContext,
  Actions,
  Store,
} from '@ngxs/store';
import { of, merge, interval, Observable } from 'rxjs';
import { tap, skip, takeUntil, flatMap, map, takeWhile, filter, catchError, take } from 'rxjs/operators';

import { DataProvider } from './models/data-provider';
import { DataProviderAsset } from './models/data-provider-asset';
import {
  LoadDataProviders,
  LoadDataProvidersSuccess,
  LoadDataProvidersFail,
  ImportAssets,
  ImportAssetsCompleted,
  ImportAssetsStatusUpdated,
  SetCurrentPath,
  UpdateDefaultSort,
} from './data-providers.actions';
import { AfterglowDataProviderService } from '../workbench/services/afterglow-data-providers';
import { BatchImportJob, BatchImportSettings, isBatchImportJob } from '../jobs/models/batch-import';
import { JobType } from '../jobs/models/job-types';
import { CorrelationIdGenerator } from '../utils/correlated-action';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { ResetState } from '../auth/auth.actions';
import { Injectable } from '@angular/core';
import { DataFilesState } from '../data-files/data-files.state';
import { JobService } from '../jobs/services/job.service';

export interface DataProviderPath {
  dataProviderId: string;
  assets: DataProviderAsset[];
}

export interface DataProvidersStateModel {
  version: string;
  dataProvidersLoaded: boolean;
  dataProviderIds: string[];
  dataProviderEntities: { [id: string]: DataProvider };
  importing: boolean;
  selectedAssetImportCorrId: string;
  importErrors: Array<string>;
  importProgress: number | null;
  lastPath: DataProviderPath | null;
  lastSavePath: DataProviderPath | null;
}

const dataProvidersDefaultState: DataProvidersStateModel = {
  version: '9ccbc82b-f8fb-4e1b-923d-48fa258cc310',
  dataProvidersLoaded: false,
  dataProviderIds: [],
  dataProviderEntities: {},
  selectedAssetImportCorrId: '',
  importing: false,
  importErrors: [],
  importProgress: null,
  lastPath: null,
  lastSavePath: null,
};

@State<DataProvidersStateModel>({
  name: 'dataProviders',
  defaults: dataProvidersDefaultState,
})
@Injectable()
export class DataProvidersState {
  constructor(
    private dataProviderService: AfterglowDataProviderService,
    private actions$: Actions,
    private store: Store,
    private correlationIdGenerator: CorrelationIdGenerator,
    private jobService: JobService
  ) { }

  @Selector()
  public static getState(state: DataProvidersStateModel) {
    return state;
  }

  @Selector()
  public static getDataProvidersLoaded(state: DataProvidersStateModel) {
    return state.dataProvidersLoaded;
  }

  @Selector()
  public static getDataProviderIds(state: DataProvidersStateModel) {
    return state.dataProviderIds;
  }

  @Selector([DataProvidersState.getDataProviderEntities])
  public static getDataProviders(entities: { [id: string]: DataProvider }) {
    return Object.values(entities);
  }

  @Selector()
  public static getDataProviderEntities(state: DataProvidersStateModel) {
    return state.dataProviderEntities;
  }

  @Selector([DataProvidersState.getDataProviderEntities])
  public static getDataProviderById(entities: { [id: string]: DataProvider }) {
    return (id: string) => {
      return id in entities ? entities[id] : null;
    };
  }

  @Selector()
  public static getImporting(state: DataProvidersStateModel) {
    return state.importing;
  }

  @Selector()
  public static getImportProgress(state: DataProvidersStateModel) {
    return state.importProgress;
  }

  @Selector()
  public static getImportErrors(state: DataProvidersStateModel) {
    return state.importErrors;
  }

  @Selector()
  public static getLastPath(state: DataProvidersStateModel) {
    return state.lastPath;
  }

  @Selector()
  public static getLastSavePath(state: DataProvidersStateModel) {
    return state.lastSavePath;
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<DataProvidersStateModel>, { }: ResetState) {
    setState((state: DataProvidersStateModel) => {
      return dataProvidersDefaultState;
    });
  }

  @Action(LoadDataProviders)
  @ImmutableContext()
  public loadDataProviders({ setState, dispatch }: StateContext<DataProvidersStateModel>) {
    return this.dataProviderService.getDataProviders().pipe(
      tap((resp) => {
        let dataProviders = resp.data;
        setState((state: DataProvidersStateModel) => {
          state.dataProvidersLoaded = true;
          state.dataProviderIds = dataProviders.map((dp) => dp.id);

          dataProviders.forEach((dp) => {
            if (!dp.defaultSort) {
              dp.defaultSort = {
                field: 'name',
                direction: '',
              };
            }

            if (dp.id in state.dataProviderEntities) {
              //preserve user-specified default sort
              dp = {
                ...dp,
                defaultSort: {
                  ...state.dataProviderEntities[dp.id].defaultSort,
                },
              };
            }
            state.dataProviderEntities[dp.id] = dp;
          });
          return state;
        });
      }),
      flatMap((resp) => {
        return dispatch(new LoadDataProvidersSuccess(resp.data));
      }),
      catchError((err) => {
        return dispatch(new LoadDataProvidersFail(err));
      })
    );
  }

  @Action(UpdateDefaultSort)
  @ImmutableContext()
  public updateDefaultSort(
    { setState, dispatch }: StateContext<DataProvidersStateModel>,
    { id, sort }: UpdateDefaultSort
  ) {
    setState((state: DataProvidersStateModel) => {
      if (id in state.dataProviderEntities) {
        state.dataProviderEntities[id].defaultSort = sort;
      }
      return state;
    });
  }

  @Action(SetCurrentPath)
  @ImmutableContext()
  public setCurrentFileSystemPath(
    { setState, getState, dispatch }: StateContext<DataProvidersStateModel>,
    { path, isSave }: SetCurrentPath
  ) {
    setState((state: DataProvidersStateModel) => {
      if (!isSave) {
        state.lastPath = path;
      } else {
        state.lastSavePath = path;
      }
      return state;
    });
  }

  @Action(ImportAssets)
  @ImmutableContext()
  public importAssets(
    { setState, getState, dispatch }: StateContext<DataProvidersStateModel>,
    { assets, correlationId }: ImportAssets
  ) {
    let job: BatchImportJob = {
      id: null,
      type: JobType.BatchImport,
      settings: assets.map((asset) => {
        let assetPath = asset.assetPath;
        if (assetPath && assetPath[0] == '/') {
          assetPath = assetPath.slice(1);
        }
        return {
          providerId: asset.dataProviderId,
          path: assetPath,
          recurse: false,
        } as BatchImportSettings;
      }),
      state: null,
      result: null,
    };

    let job$ = this.jobService.createJob(job);
    return job$.pipe(
      tap(job => {
        if (!isBatchImportJob(job)) return
        dispatch(new ImportAssetsStatusUpdated(job, correlationId));
        if (job.state.status == 'completed' && job.result) {
          if (!isBatchImportJob(job)) return;
          let result = job.result;
          if (result.errors.length != 0) {
            console.error('Errors encountered during import: ', result.errors);
          }
          if (result.warnings.length != 0) {
            console.error('Warnings encountered during import: ', result.warnings);
          }

          let fileIds = result.fileIds.map((id) => id.toString());
          result.errors
            .filter((e) => e.id == 'DuplicateDataFileNameError')
            .forEach((e, index) => {
              let layer = this.store.selectSnapshot(DataFilesState.getHduEntities)[e.meta.fileId];
              if (layer) {
                fileIds.push(layer.id);
              }
            });

          let jobErrors = result.errors.filter(
            (error) => error.id != 'DuplicateDataFileNameError' || !fileIds.includes(error.meta.fileId)
          );

          //ignore errors where the file has already been imported
          let errors = jobErrors.map((error) => error.detail);

          dispatch(new ImportAssetsCompleted(assets, fileIds, errors, correlationId));
        }
        else if (job.state.status == 'canceled') {
          dispatch(
            new ImportAssetsCompleted(assets, [], [`Unable to import assets.  Operation was canceled`], correlationId)
          );
        }
      }),
      catchError(error => {
        dispatch(
          new ImportAssetsCompleted(
            assets,
            [],
            [`Unable to import assets.  Please try again later: Error: ${error}`],
            correlationId
          )
        );
        return of(job)
      })
    )
  }
}
