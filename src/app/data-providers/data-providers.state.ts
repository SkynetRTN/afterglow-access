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
  LoadDataProviderAssets,
  LoadDataProviderAssetsSuccess,
  LoadDataProviderAssetsFail,
  SortDataProviderAssets,
  ImportSelectedAssets,
  ImportAssets,
  ImportAssetsCompleted,
  ImportAssetsCancel,
  ImportAssetsStatusUpdated,
} from "./data-providers.actions";
import { AfterglowDataProviderService } from "../workbench/services/afterglow-data-providers";
import {
  UpdateJobSuccess,
  CreateJob,
  CreateJobSuccess,
  CreateJobFail,
  UpdateJobResultSuccess,
  JobCompleted,
  UpdateJob,
} from "../jobs/jobs.actions";
import { BatchImportJob, BatchImportSettings, BatchImportJobResult } from "../jobs/models/batch-import";
import { JobType } from "../jobs/models/job-types";
import { CorrelationIdGenerator } from "../utils/correlated-action";
import { Navigate } from "@ngxs/router-plugin";
import { SetViewerData, SelectDataFileListItem } from "../workbench/workbench.actions";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
import { JobsState } from "../jobs/jobs.state";
import { LoadLibrary } from "../data-files/data-files.actions";
import { ResetState } from "../auth/auth.actions";
import { DataFilesState } from "../data-files/data-files.state";

export interface DataProvidersStateModel {
  version: number;
  dataProvidersLoaded: boolean;
  dataProviders: DataProvider[];
  loadingAssets: boolean;
  currentProvider: DataProvider;
  currentPath: string;
  currentPathBreadcrumbs: Array<{ name: string; url: string }>;
  currentAssets: DataProviderAsset[];
  userSortField: string;
  userSortOrder: "" | "asc" | "desc";
  currentSortField: string;
  currentSortOrder: "" | "asc" | "desc";
  importing: boolean;
  importErrors: Array<string>;
  importProgress: number;
  lastPath: { [id: string]: string };
  selectedAssetImportCorrId: string;
}

const dataProvidersDefaultState: DataProvidersStateModel = {
  version: 1,
  dataProvidersLoaded: false,
  dataProviders: [],
  loadingAssets: false,
  currentProvider: null,
  currentPath: "",
  currentPathBreadcrumbs: [],
  currentAssets: [],
  userSortField: null,
  userSortOrder: "asc",
  currentSortField: null,
  currentSortOrder: "asc",
  importing: false,
  importErrors: [],
  importProgress: 0,
  lastPath: {},
  selectedAssetImportCorrId: null,
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
  ) {}

  @Selector()
  public static getState(state: DataProvidersStateModel) {
    return state;
  }

  @Selector()
  public static getDataProvidersLoaded(state: DataProvidersStateModel) {
    return state.dataProvidersLoaded;
  }

  @Selector()
  public static getDataProviders(state: DataProvidersStateModel) {
    return state.dataProviders;
  }

  @Selector()
  public static getCurrentProvider(state: DataProvidersStateModel) {
    return state.currentProvider;
  }

  @Selector()
  public static getCurrentAssets(state: DataProvidersStateModel) {
    return state.currentAssets;
  }

  @Selector()
  public static getLoadingAssets(state: DataProvidersStateModel) {
    return state.loadingAssets;
  }

  @Selector()
  public static getCurrentPathBreadcrumbs(state: DataProvidersStateModel) {
    return state.currentPathBreadcrumbs;
  }

  @Selector()
  public static getCurrentSortField(state: DataProvidersStateModel) {
    return state.currentSortField;
  }

  @Selector()
  public static getCurrentSortOrder(state: DataProvidersStateModel) {
    return state.currentSortOrder;
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
  public static getLastPath(state: DataProvidersStateModel) {
    return state.lastPath;
  }

  @Selector()
  public static getImportErrors(state: DataProvidersStateModel) {
    return state.importErrors;
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<DataProvidersStateModel>, {}: ResetState) {
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
          state.dataProviders = dataProviders;
          state.dataProvidersLoaded = true;
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

  @Action(LoadDataProviderAssets)
  @ImmutableContext()
  public loadDataProviderAssets(
    { setState, dispatch }: StateContext<DataProvidersStateModel>,
    { dataProvider, path }: LoadDataProviderAssets
  ) {
    setState((state: DataProvidersStateModel) => {
      if (state.importProgress == 100) {
        state.importProgress = 0;
        state.importErrors = [];
        state.importing = false;
      }
      state.loadingAssets = true;

      return state;
    });

    return this.dataProviderService.getAssets(dataProvider.id, path).pipe(
      tap((assets) => {
        setState((state: DataProvidersStateModel) => {
          //split path into breadcrumb URIs
          state.loadingAssets = false;
          state.currentProvider = dataProvider;
          state.currentPath = path;

          let breadcrumbs: Array<{ name: string; url: string }> = [];
          if (dataProvider.browseable) {
            breadcrumbs.push({ name: dataProvider.name, url: path ? "" : null });
            if (path) {
              let paths = path.split("/");
              for (let i = 0; i < paths.length; i++) {
                if (paths[i] == "") continue;
                breadcrumbs.push({
                  name: paths[i],
                  url:
                    i == paths.length - 1
                      ? null
                      : breadcrumbs[breadcrumbs.length - 1]["url"].concat(i == 0 ? "" : "/", paths[i]),
                });
              }
            }
          }
          state.currentPathBreadcrumbs = breadcrumbs;
          state.currentAssets = assets;
          state.lastPath[dataProvider.id] = path;

          return state;
        });
      }),
      flatMap((assets) => {
        return dispatch(new LoadDataProviderAssetsSuccess(dataProvider, path, assets));
      }),
      catchError((err) => {
        setState((state: DataProvidersStateModel) => {
          //split path into breadcrumb URIs
          state.loadingAssets = false;
          return state;
        });
        return dispatch(new LoadDataProviderAssetsFail(err));
      })
    );
  }

  @Action(SortDataProviderAssets)
  @ImmutableContext()
  public sortDataProviderAssets(
    { setState, getState, dispatch }: StateContext<DataProvidersStateModel>,
    { fieldName, order }: SortDataProviderAssets
  ) {
    let state = getState();
    let userSortField = state.userSortField;
    let userSortOrder = state.userSortOrder;

    let currentSortField = null;
    let currentSortOrder: "" | "asc" | "desc" = "asc";

    //if action sets the sort field, use it
    if (fieldName) {
      userSortField = fieldName;
      if (order) userSortOrder = order;
    }

    if (userSortField) {
      //verify that the user selected sort field exists
      if (userSortField == "name") {
        currentSortField = userSortField;
        currentSortOrder = userSortOrder;
      } else if (state.currentProvider) {
        let col = state.currentProvider.columns.find((col) => col.fieldName == userSortField);
        if (col) {
          currentSortField = userSortField;
          currentSortOrder = userSortOrder;
        }
      }
    }

    if (!currentSortField) {
      //get default from current provider
      if (state.currentProvider && state.currentProvider.sortBy) {
        let col = state.currentProvider.columns.find((col) => col.name == state.currentProvider.sortBy);
        if (col) {
          currentSortField = col.fieldName;
          currentSortOrder = state.currentProvider.sortAsc ? "asc" : "desc";
        }
      }
    }

    if (!currentSortField) {
      //use defaults
      currentSortField = "name";
      currentSortOrder = "asc";
    }

    let currentAssets = state.currentAssets.slice().sort((a, b) => {
      if (currentSortField != "name") {
        if (currentSortField in a.metadata) {
          //custom sort using metadata column
          if (a.metadata[currentSortField] < b.metadata[currentSortField]) {
            return currentSortOrder == "asc" ? -1 : 1;
          }
          if (a.metadata[currentSortField] > b.metadata[currentSortField]) {
            return currentSortOrder == "asc" ? 1 : -1;
          }
          return 0;
        }
        currentSortField = "name";
        currentSortOrder = "asc";
      }

      if (a.collection != b.collection) {
        return a.collection ? -1 : 1;
      }

      if (a.name.toUpperCase() < b.name.toUpperCase()) {
        return currentSortOrder == "asc" ? -1 : 1;
      }

      if (a.name.toUpperCase() > b.name.toUpperCase()) {
        return currentSortOrder == "asc" ? 1 : -1;
      }
      return 0;
    });

    return {
      ...state,
      currentAssets: currentAssets,
      userSortField: userSortField,
      userSortOrder: userSortOrder,
      currentSortField: currentSortField,
      currentSortOrder: currentSortOrder,
    };

    // setState((state: DataProvidersStateModel) => {
    //   state.currentAssets = currentAssets;
    //   state.userSortField = userSortField;
    //   state.userSortOrder = userSortOrder;
    //   state.currentSortField = currentSortField;
    //   state.currentSortOrder = currentSortOrder;

    //   return state;
    // });
  }

  @Action(ImportSelectedAssets)
  @ImmutableContext()
  public importSelectedAssets(
    { setState, getState, dispatch }: StateContext<DataProvidersStateModel>,
    { dataProviderId, assets }: ImportSelectedAssets
  ) {
    let importSelectedAssetsCorrId = this.correlationIdGenerator.next();
    setState((state: DataProvidersStateModel) => {
      state.importing = true;
      state.importProgress = 0;
      state.selectedAssetImportCorrId = importSelectedAssetsCorrId;
      state.importErrors = [];

      return state;
    });

    let importCompleted$ = this.actions$.pipe(
      ofActionDispatched(ImportAssetsCompleted),
      filter<ImportAssetsCompleted>((action) => action.correlationId == importSelectedAssetsCorrId),
      take(1)
    );

    let importProgress$ = this.actions$.pipe(
      ofActionDispatched(ImportAssetsStatusUpdated),
      filter<ImportAssetsStatusUpdated>((action) => action.correlationId == importSelectedAssetsCorrId),
      takeUntil(importCompleted$),
      tap((action) => {
        setState((state: DataProvidersStateModel) => {
          state.importProgress = action.job.state.progress;
          return state;
        });
      })
    );

    return merge(
      dispatch(new ImportAssets(dataProviderId, assets, importSelectedAssetsCorrId)),
      importProgress$,
      importCompleted$.pipe(
        flatMap((action) => {
          setState((state: DataProvidersStateModel) => {
            state.importing = false;
            state.importProgress = 100;
            state.importErrors = action.errors;

            return state;
          });

          if (action.errors.length != 0) return of();
          dispatch(new Navigate(["/"]));
          dispatch(new LoadLibrary());
          return this.actions$.pipe(
            ofActionCompleted(LoadLibrary),
            take(1),
            filter((a) => a.result.successful),
            tap((v) => {
              let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
              if (action.fileIds[0] in hduEntities) {
                let hdu = hduEntities[action.fileIds[0]];
                dispatch(new SelectDataFileListItem({ fileId: hdu.fileId, hduId: hdu.id }));
              }
            })
          );
        })
      )
    );
  }

  @Action(ImportAssets)
  @ImmutableContext()
  public importAssets(
    { setState, getState, dispatch }: StateContext<DataProvidersStateModel>,
    { dataProviderId, assets, correlationId }: ImportAssets
  ) {
    let job: BatchImportJob = {
      id: null,
      type: JobType.BatchImport,
      settings: assets.map((asset) => {
        return {
          provider_id: parseInt(dataProviderId),
          path: asset.path,
          recurse: false,
        } as BatchImportSettings;
      }),
    };

    let jobCorrelationId = this.correlationIdGenerator.next();
    dispatch(new CreateJob(job, 1000, jobCorrelationId));

    let jobCompleted$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((a) => a.action.correlationId == jobCorrelationId)
    );

    let jobCanceled$ = this.actions$.pipe(
      ofActionCanceled(CreateJob),
      filter((a) => a.action.correlationId == jobCorrelationId)
    );

    let jobErrored$ = this.actions$.pipe(
      ofActionErrored(CreateJob),
      filter((a) => a.action.correlationId == jobCorrelationId),
      tap((action) => {
        return dispatch(
          new ImportAssetsCompleted(
            assets,
            [],
            [`Unable to create the batch import job.  Please try again later: Error: ${action.error}`],
            correlationId
          )
        );
      })
    );

    let jobSuccessful$ = this.actions$.pipe(
      ofActionSuccessful(CreateJob),
      filter<CreateJob>((a) => a.correlationId == jobCorrelationId),
      takeUntil(merge(jobCanceled$, jobErrored$)),
      take(1),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
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
            result.errors,
            correlationId
          )
        );
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<CreateJob>((a) => a.correlationId == jobCorrelationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
        return dispatch(new ImportAssetsStatusUpdated(jobEntity.job as BatchImportJob, correlationId));
      })
    );

    return merge(jobSuccessful$, jobUpdated$);
  }
}
