import {
  State,
  Action,
  Selector,
  StateContext,
  Actions,
  ofActionDispatched,
  getActionTypeFromInstance,
  ofActionCompleted,
  ofActionCanceled,
  ofActionErrored,
  ofActionSuccessful,
  Store,
} from "@ngxs/store";
import { of, merge, interval, Observable } from "rxjs";
import { tap, skip, takeUntil, flatMap, map, takeWhile, filter, catchError, take } from "rxjs/operators";

import { DataProvider } from "./models/data-provider";
import { DataProviderAsset } from "./models/data-provider-asset";
import {
  LoadDataProviders,
  LoadDataProvidersSuccess,
  LoadDataProvidersFail,
  LoadAssets,
  LoadDataProviderAssetsSuccess,
  LoadDataProviderAssetsFail,
  ImportAssets,
  ImportAssetsCompleted,
  ImportAssetsStatusUpdated,
  SetCurrentPath,
} from "./data-providers.actions";
import { AfterglowDataProviderService } from "../workbench/services/afterglow-data-providers";
import {
  CreateJob,
  UpdateJob,
} from "../jobs/jobs.actions";
import { BatchImportJob, BatchImportSettings, BatchImportJobResult } from "../jobs/models/batch-import";
import { JobType } from "../jobs/models/job-types";
import { CorrelationIdGenerator } from "../utils/correlated-action";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
import { JobsState } from "../jobs/jobs.state";
import { ResetState } from "../auth/auth.actions";

export interface DataProvidersStateModel {
  version: string;
  dataProvidersLoaded: boolean;
  dataProviderIds: string[];
  dataProviderEntities: { [id: string]: DataProvider }
  importing: boolean;
  selectedAssetImportCorrId: string;
  importErrors: Array<string>;
  importProgress: number;
  currentPath: string;
}

const dataProvidersDefaultState: DataProvidersStateModel = {
  version: '91d88797-7f4e-4672-ab05-0a68ba7ae4a0',
  dataProvidersLoaded: false,
  dataProviderIds: [],
  dataProviderEntities: {},
  selectedAssetImportCorrId: null,
  importing: false,
  importErrors: [],
  importProgress: 0,
  currentPath: '/',
};

@State<DataProvidersStateModel>({
  name: "dataProviders",
  defaults: dataProvidersDefaultState,
})
export class DataProvidersState {
  constructor(
    private dataProviderService: AfterglowDataProviderService,
    private actions$: Actions,
    private store: Store,
    private correlationIdGenerator: CorrelationIdGenerator
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

  @Selector()
  public static getDataProviders(state: DataProvidersStateModel) {
    return Object.values(state.dataProviderEntities);
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
  public static getCurrentPath(state: DataProvidersStateModel) {
    return state.currentPath;
  }

  @Selector()
  public static getCurrentDataProvider(state: DataProvidersStateModel) {
    let dpName = state.currentPath.split('/')[0];
    if (!dpName) {
      return null;
    }
    return Object.values(state.dataProviderEntities).find(dp => dp.name == dpName)
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
      tap((dataProviders) => {
        setState((state: DataProvidersStateModel) => {
          state.dataProvidersLoaded = true;
          state.dataProviderIds = dataProviders.map(dp => dp.id);
          dataProviders.forEach(dp => state.dataProviderEntities[dp.id] = dp)

          // //remove data providers from file system root which are no longer present
          // state.fileSystem = state.fileSystem.filter(fsObject => state.dataProviderIds.includes(fsObject.assetPath))

          // dataProviders.forEach((dataProvider) => {
          //   let dataProviderFileSystemObject = state.fileSystem.find(fsObj => fsObj.assetPath == dataProvider.id)
          //   if (dataProviderFileSystemObject) {
          //     let index = state.fileSystem.indexOf(dataProviderFileSystemObject)
          //     //file system already exists.  update if necessary
          //     state.fileSystem[index] = {
          //       ...state.fileSystem[index],
          //       metadata: {
          //         description: dataProvider.description
          //       }
          //     }
          //   }
          //   else {
          //     //new file system
          //     state.fileSystem.push({
          //       dataProviderId: dataProvider.id,
          //       assetPath: '',
          //       isDirectory: true,
          //       items: [],
          //       name: dataProvider.name,
          //       metadata: {
          //         description: dataProvider.description
          //       }
          //     })
          //   }

          // })
          return state;
        });
      }),
      flatMap((dataProviders) => {
        return dispatch(new LoadDataProvidersSuccess(dataProviders));
      }),
      catchError((err) => {
        return dispatch(new LoadDataProvidersFail(err));
      })
    );
  }

  // @Action(LoadAssets)
  // @ImmutableContext()
  // public loadDataProviderAssets(
  //   { setState, getState, dispatch }: StateContext<DataProvidersStateModel>,
  //   { }: LoadAssets
  // ) {

  //   setState((state: DataProvidersStateModel) => {
  //     state.loadingAssets = true;
  //     return state;
  //   });

  //   let state = getState();
  //   if(state.currentPath == '/' || state.currentPath == '') {
  //     // root - return data providers
  //     return state.
  //   }

  //   return this.dataProviderService.getAssets(dataProviderId, path).pipe(
  //     tap((assets) => {
  //       setState((state: DataProvidersStateModel) => {
  //         //split path into breadcrumb URIs
  //         state.loadingAssets = false;

  //         //update filesystem
  //         let target = state.fileSystem.find(fsObj => fsObj.assetPath == dataProviderId);
  //         let currentPath = '';
  //         if (path != '') {
  //           path.split('/').forEach(name => {
  //             currentPath += name;
  //             target = target.items.find(fsObj => fsObj.assetPath == currentPath);
  //             if (!target) {
  //               target = {
  //                 assetPath: currentPath,
  //                 dataProviderId: dataProviderId,
  //                 isDirectory: true,
  //                 items: [],
  //                 name: name,
  //                 metadata: {}
  //               };
  //               target.items.push(target)
  //             }
  //             currentPath += '/'
  //           })
  //         }

  //         target.items = assets;

  //         return state;
  //       });
  //     }),
  //     flatMap((assets) => {
  //       return dispatch(new LoadDataProviderAssetsSuccess(dataProviderId, path, assets));
  //     }),
  //     catchError((err) => {
  //       setState((state: DataProvidersStateModel) => {
  //         //split path into breadcrumb URIs
  //         state.loadingAssets = false;
  //         return state;
  //       });
  //       return dispatch(new LoadDataProviderAssetsFail(err));
  //     })
  //   );
  // }

  @Action(SetCurrentPath)
  @ImmutableContext()
  public setCurrentFileSystemPath(
    { setState, getState, dispatch }: StateContext<DataProvidersStateModel>,
    { path }: SetCurrentPath
  ) {

    let actions = [];
    setState((state: DataProvidersStateModel) => {
      if(path != state.currentPath) {
        state.currentPath = path;
      }
      
      return state;
    })
    return dispatch(actions);

  }

  // @Action(SortDataProviderAssets)
  // @ImmutableContext()
  // public sortDataProviderAssets(
  //   { setState, getState, dispatch }: StateContext<DataProvidersStateModel>,
  //   { fieldName, order }: SortDataProviderAssets
  // ) {
  //   setState((state: DataProvidersStateModel) => {
  //     let userSortField = state.userSortField;
  //     let userSortOrder = state.userSortOrder;

  //     let currentSortField = null;
  //     let currentSortOrder: "" | "asc" | "desc" = "asc";

  //     //if action sets the sort field, use it
  //     if (fieldName) {
  //       userSortField = fieldName;
  //       if (order) userSortOrder = order;
  //     }

  //     if (userSortField) {
  //       //verify that the user selected sort field exists
  //       if (userSortField == "name") {
  //         currentSortField = userSortField;
  //         currentSortOrder = userSortOrder;
  //       } else if (state.currentProvider) {
  //         let col = state.currentProvider.columns.find((col) => col.fieldName == userSortField);
  //         if (col) {
  //           currentSortField = userSortField;
  //           currentSortOrder = userSortOrder;
  //         }
  //       }
  //     }

  //     if (!currentSortField) {
  //       //get default from current provider
  //       if (state.currentProvider && state.currentProvider.sortBy) {
  //         let col = state.currentProvider.columns.find((col) => col.name == state.currentProvider.sortBy);
  //         if (col) {
  //           currentSortField = col.fieldName;
  //           currentSortOrder = state.currentProvider.sortAsc ? "asc" : "desc";
  //         }
  //       }
  //     }

  //     if (!currentSortField) {
  //       //use defaults
  //       currentSortField = "name";
  //       currentSortOrder = "asc";
  //     }

  //     state.userSortField = userSortField;
  //     state.userSortOrder = userSortOrder;
  //     state.currentSortField = currentSortField;
  //     state.currentSortOrder = currentSortOrder;
  //     return state;
  //   });
  // }

  // @Action(ImportSelectedAssets)
  // @ImmutableContext()
  // public importSelectedAssets(
  //   { setState, getState, dispatch }: StateContext<DataProvidersStateModel>,
  //   { dataProviderId, assets }: ImportSelectedAssets
  // ) {
  //   let importSelectedAssetsCorrId = this.correlationIdGenerator.next();
  //   setState((state: DataProvidersStateModel) => {
  //     state.importing = true;
  //     state.importProgress = 0;
  //     state.selectedAssetImportCorrId = importSelectedAssetsCorrId;
  //     state.importErrors = [];

  //     return state;
  //   });

  //   let importCompleted$ = this.actions$.pipe(
  //     ofActionDispatched(ImportAssetsCompleted),
  //     filter<ImportAssetsCompleted>((action) => action.correlationId == importSelectedAssetsCorrId),
  //     take(1)
  //   );

  //   let importProgress$ = this.actions$.pipe(
  //     ofActionDispatched(ImportAssetsStatusUpdated),
  //     filter<ImportAssetsStatusUpdated>((action) => action.correlationId == importSelectedAssetsCorrId),
  //     takeUntil(importCompleted$),
  //     tap((action) => {
  //       setState((state: DataProvidersStateModel) => {
  //         state.importProgress = action.job.state.progress;
  //         return state;
  //       });
  //     })
  //   );

  //   return merge(
  //     dispatch(new ImportAssets(dataProviderId, assets, importSelectedAssetsCorrId)),
  //     importProgress$,
  //     importCompleted$.pipe(
  //       flatMap((action) => {
  //         setState((state: DataProvidersStateModel) => {
  //           state.importing = false;
  //           state.importProgress = 100;
  //           state.importErrors = action.errors;

  //           return state;
  //         });

  //         if (action.errors.length != 0) return of();
  //         dispatch(new Navigate(["/"]));
  //         dispatch(new LoadLibrary());
  //         return this.actions$.pipe(
  //           ofActionCompleted(LoadLibrary),
  //           take(1),
  //           filter((a) => a.result.successful),
  //           tap((v) => {
  //             let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
  //             if (action.fileIds[0] in hduEntities) {
  //               let hdu = hduEntities[action.fileIds[0]];
  //               dispatch(new SelectDataFileListItem({ fileId: hdu.fileId, hduId: hdu.id }));
  //             }
  //           })
  //         );
  //       })
  //     )
  //   );
  // }

  @Action(ImportAssets)
  @ImmutableContext()
  public importAssets(
    { setState, getState, dispatch }: StateContext<DataProvidersStateModel>,
    { assets }: ImportAssets
  ) {
    let job: BatchImportJob = {
      id: null,
      type: JobType.BatchImport,
      settings: assets.map((asset) => {
        return {
          provider_id: parseInt(asset.dataProviderId),
          path: asset.assetPath,
          recurse: false,
        } as BatchImportSettings;
      }),
    };

    let jobCorrelationId = this.correlationIdGenerator.next();
    dispatch(new CreateJob(job, 1000, jobCorrelationId));

    let jobCompleted$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((a) => a.action.correlationId == jobCorrelationId),
      take(1),
      tap((a) => {
        if (a.result.successful) {
          let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.action.job.id];
          let result = jobEntity.result as BatchImportJobResult;
          if (result.errors.length != 0) {
            console.error("Errors encountered during import: ", result.errors);
          }
          if (result.warnings.length != 0) {
            console.error("Warnings encountered during import: ", result.warnings);
          }
          return dispatch(
            new ImportAssetsCompleted(
              assets,
              result.file_ids.map((id) => id.toString()),
              result.errors
            )
          );
        }
        else if (a.result.canceled) {
          return dispatch(
            new ImportAssetsCompleted(
              assets,
              [],
              [`Unable to import assets.  Operation was canceled`],
            )
          );
        }
        else if (a.result.error) {
          return dispatch(
            new ImportAssetsCompleted(
              assets,
              [],
              [`Unable to import assets.  Please try again later: Error: ${a.result.error}`],
            )
          );
        }

      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<CreateJob>((a) => a.correlationId == jobCorrelationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
        return dispatch(new ImportAssetsStatusUpdated(jobEntity.job as BatchImportJob));
      })
    );

    return merge(jobCompleted$, jobUpdated$);
  }
}
