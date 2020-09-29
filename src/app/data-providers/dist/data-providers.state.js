"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.DataProvidersState = void 0;
var store_1 = require("@ngxs/store");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var data_providers_actions_1 = require("./data-providers.actions");
var jobs_actions_1 = require("../jobs/jobs.actions");
var job_types_1 = require("../jobs/models/job-types");
var router_plugin_1 = require("@ngxs/router-plugin");
var workbench_actions_1 = require("../workbench/workbench.actions");
var immer_adapter_1 = require("@ngxs-labs/immer-adapter");
var jobs_state_1 = require("../jobs/jobs.state");
var data_files_actions_1 = require("../data-files/data-files.actions");
var auth_actions_1 = require("../auth/auth.actions");
var dataProvidersDefaultState = {
    version: 1,
    dataProvidersLoaded: false,
    dataProviders: [],
    loadingAssets: false,
    currentProvider: null,
    currentPath: '',
    currentPathBreadcrumbs: [],
    currentAssets: [],
    userSortField: null,
    userSortOrder: 'asc',
    currentSortField: null,
    currentSortOrder: 'asc',
    importing: false,
    importErrors: [],
    importProgress: 0,
    lastPath: {},
    selectedAssetImportCorrId: null
};
var DataProvidersState = /** @class */ (function () {
    function DataProvidersState(dataProviderService, actions$, store, correlationIdGenerator) {
        this.dataProviderService = dataProviderService;
        this.actions$ = actions$;
        this.store = store;
        this.correlationIdGenerator = correlationIdGenerator;
    }
    DataProvidersState.getState = function (state) {
        return state;
    };
    DataProvidersState.getDataProvidersLoaded = function (state) {
        return state.dataProvidersLoaded;
    };
    DataProvidersState.getDataProviders = function (state) {
        return state.dataProviders;
    };
    DataProvidersState.getCurrentProvider = function (state) {
        return state.currentProvider;
    };
    DataProvidersState.getCurrentAssets = function (state) {
        return state.currentAssets;
    };
    DataProvidersState.getLoadingAssets = function (state) {
        return state.loadingAssets;
    };
    DataProvidersState.getCurrentPathBreadcrumbs = function (state) {
        return state.currentPathBreadcrumbs;
    };
    DataProvidersState.getCurrentSortField = function (state) {
        return state.currentSortField;
    };
    DataProvidersState.getCurrentSortOrder = function (state) {
        return state.currentSortOrder;
    };
    DataProvidersState.getImporting = function (state) {
        return state.importing;
    };
    DataProvidersState.getImportProgress = function (state) {
        return state.importProgress;
    };
    DataProvidersState.getLastPath = function (state) {
        return state.lastPath;
    };
    DataProvidersState.getImportErrors = function (state) {
        return state.importErrors;
    };
    DataProvidersState.prototype.resetState = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        setState(function (state) {
            return dataProvidersDefaultState;
        });
    };
    DataProvidersState.prototype.loadDataProviders = function (_a) {
        var setState = _a.setState, dispatch = _a.dispatch;
        return this.dataProviderService.getDataProviders().pipe(operators_1.tap(function (dataProviders) {
            setState(function (state) {
                state.dataProviders = dataProviders;
                state.dataProvidersLoaded = true;
                return state;
            });
        }), operators_1.flatMap(function (dataProviders) {
            return dispatch(new data_providers_actions_1.LoadDataProvidersSuccess(dataProviders));
        }), operators_1.catchError(function (err) {
            return dispatch(new data_providers_actions_1.LoadDataProvidersFail(err));
        }));
    };
    DataProvidersState.prototype.loadDataProviderAssets = function (_a, _b) {
        var setState = _a.setState, dispatch = _a.dispatch;
        var dataProvider = _b.dataProvider, path = _b.path;
        setState(function (state) {
            if (state.importProgress == 100) {
                state.importProgress = 0;
                state.importErrors = [];
                state.importing = false;
            }
            state.loadingAssets = true;
            return state;
        });
        return this.dataProviderService.getAssets(dataProvider.id, path).pipe(operators_1.tap(function (assets) {
            setState(function (state) {
                //split path into breadcrumb URIs
                state.loadingAssets = false;
                state.currentProvider = dataProvider;
                state.currentPath = path;
                var breadcrumbs = [];
                if (dataProvider.browseable) {
                    breadcrumbs.push({ name: dataProvider.name, url: path ? '' : null });
                    if (path) {
                        var paths = path.split('/');
                        for (var i = 0; i < paths.length; i++) {
                            if (paths[i] == '')
                                continue;
                            breadcrumbs.push({ name: paths[i], url: i == paths.length - 1 ? null : breadcrumbs[breadcrumbs.length - 1]['url'].concat(i == 0 ? '' : '/', paths[i]) });
                        }
                    }
                }
                state.currentPathBreadcrumbs = breadcrumbs;
                state.currentAssets = assets;
                state.lastPath[dataProvider.id] = path;
                return state;
            });
        }), operators_1.flatMap(function (assets) {
            return dispatch(new data_providers_actions_1.LoadDataProviderAssetsSuccess(dataProvider, path, assets));
        }), operators_1.catchError(function (err) {
            setState(function (state) {
                //split path into breadcrumb URIs
                state.loadingAssets = false;
                return state;
            });
            return dispatch(new data_providers_actions_1.LoadDataProviderAssetsFail(err));
        }));
    };
    DataProvidersState.prototype.sortDataProviderAssets = function (_a, _b) {
        var setState = _a.setState, getState = _a.getState, dispatch = _a.dispatch;
        var fieldName = _b.fieldName, order = _b.order;
        var state = getState();
        var userSortField = state.userSortField;
        var userSortOrder = state.userSortOrder;
        var currentSortField = null;
        var currentSortOrder = 'asc';
        //if action sets the sort field, use it
        if (fieldName) {
            userSortField = fieldName;
            if (order)
                userSortOrder = order;
        }
        if (userSortField) {
            //verify that the user selected sort field exists
            if (userSortField == 'name') {
                currentSortField = userSortField;
                currentSortOrder = userSortOrder;
            }
            else if (state.currentProvider) {
                var col = state.currentProvider.columns.find(function (col) { return col.fieldName == userSortField; });
                if (col) {
                    currentSortField = userSortField;
                    currentSortOrder = userSortOrder;
                }
            }
        }
        if (!currentSortField) {
            //get default from current provider
            if (state.currentProvider && state.currentProvider.sortBy) {
                var col = state.currentProvider.columns.find(function (col) { return col.name == state.currentProvider.sortBy; });
                if (col) {
                    currentSortField = col.fieldName;
                    currentSortOrder = state.currentProvider.sortAsc ? 'asc' : 'desc';
                }
            }
        }
        if (!currentSortField) {
            //use defaults
            currentSortField = 'name';
            currentSortOrder = 'asc';
        }
        var currentAssets = state.currentAssets.slice().sort(function (a, b) {
            if (currentSortField != 'name') {
                if (currentSortField in a.metadata) {
                    //custom sort using metadata column
                    if (a.metadata[currentSortField] < b.metadata[currentSortField]) {
                        return currentSortOrder == 'asc' ? -1 : 1;
                    }
                    if (a.metadata[currentSortField] > b.metadata[currentSortField]) {
                        return currentSortOrder == 'asc' ? 1 : -1;
                    }
                    return 0;
                }
                currentSortField = 'name';
                currentSortOrder = 'asc';
            }
            if (a.collection != b.collection) {
                return a.collection ? -1 : 1;
            }
            if (a.name.toUpperCase() < b.name.toUpperCase()) {
                return currentSortOrder == 'asc' ? -1 : 1;
            }
            if (a.name.toUpperCase() > b.name.toUpperCase()) {
                return currentSortOrder == 'asc' ? 1 : -1;
            }
            return 0;
        });
        return __assign(__assign({}, state), { currentAssets: currentAssets, userSortField: userSortField, userSortOrder: userSortOrder, currentSortField: currentSortField, currentSortOrder: currentSortOrder });
        // setState((state: DataProvidersStateModel) => {
        //   state.currentAssets = currentAssets;
        //   state.userSortField = userSortField;
        //   state.userSortOrder = userSortOrder;
        //   state.currentSortField = currentSortField;
        //   state.currentSortOrder = currentSortOrder;
        //   return state;
        // });
    };
    DataProvidersState.prototype.importSelectedAssets = function (_a, _b) {
        var _this = this;
        var setState = _a.setState, getState = _a.getState, dispatch = _a.dispatch;
        var dataProviderId = _b.dataProviderId, assets = _b.assets;
        var importSelectedAssetsCorrId = this.correlationIdGenerator.next();
        setState(function (state) {
            state.importing = true;
            state.importProgress = 0;
            state.selectedAssetImportCorrId = importSelectedAssetsCorrId;
            state.importErrors = [];
            return state;
        });
        var importCompleted$ = this.actions$.pipe(store_1.ofActionDispatched(data_providers_actions_1.ImportAssetsCompleted), operators_1.filter(function (action) { return action.correlationId == importSelectedAssetsCorrId; }), operators_1.take(1));
        var importProgress$ = this.actions$.pipe(store_1.ofActionDispatched(data_providers_actions_1.ImportAssetsStatusUpdated), operators_1.filter(function (action) { return action.correlationId == importSelectedAssetsCorrId; }), operators_1.takeUntil(importCompleted$), operators_1.tap(function (action) {
            setState(function (state) {
                state.importProgress = action.job.state.progress;
                return state;
            });
        }));
        return rxjs_1.merge(dispatch(new data_providers_actions_1.ImportAssets(dataProviderId, assets, importSelectedAssetsCorrId)), importProgress$, importCompleted$.pipe(operators_1.flatMap(function (action) {
            setState(function (state) {
                state.importing = false;
                state.importProgress = 100;
                state.importErrors = action.errors;
                return state;
            });
            if (action.errors.length != 0)
                return rxjs_1.of();
            dispatch(new router_plugin_1.Navigate(['/']));
            dispatch(new data_files_actions_1.LoadLibrary());
            return _this.actions$.pipe(store_1.ofActionCompleted(data_files_actions_1.LoadLibrary), operators_1.take(1), operators_1.filter(function (a) { return a.result.successful; }), operators_1.tap(function (v) {
                dispatch(new workbench_actions_1.SelectDataFile(action.fileIds[0]));
            }));
        })));
    };
    DataProvidersState.prototype.importAssets = function (_a, _b) {
        var _this = this;
        var setState = _a.setState, getState = _a.getState, dispatch = _a.dispatch;
        var dataProviderId = _b.dataProviderId, assets = _b.assets, correlationId = _b.correlationId;
        var job = {
            id: null,
            type: job_types_1.JobType.BatchImport,
            settings: assets.map(function (asset) {
                return {
                    provider_id: parseInt(dataProviderId),
                    path: asset.path,
                    recurse: false
                };
            })
        };
        var jobCorrelationId = this.correlationIdGenerator.next();
        dispatch(new jobs_actions_1.CreateJob(job, 1000, jobCorrelationId));
        var jobCompleted$ = this.actions$.pipe(store_1.ofActionCompleted(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == jobCorrelationId; }));
        var jobCanceled$ = this.actions$.pipe(store_1.ofActionCanceled(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == jobCorrelationId; }));
        var jobErrored$ = this.actions$.pipe(store_1.ofActionErrored(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == jobCorrelationId; }), operators_1.tap(function (action) {
            return dispatch(new data_providers_actions_1.ImportAssetsCompleted(assets, [], ["Unable to create the batch import job.  Please try again later: Error: " + action.error], correlationId));
        }));
        var jobSuccessful$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.correlationId == jobCorrelationId; }), operators_1.takeUntil(rxjs_1.merge(jobCanceled$, jobErrored$)), operators_1.take(1), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            var result = jobEntity.result;
            if (result.errors.length != 0) {
                console.error("Errors encountered during stacking: ", result.errors);
            }
            if (result.warnings.length != 0) {
                console.error("Warnings encountered during stacking: ", result.warnings);
            }
            return dispatch(new data_providers_actions_1.ImportAssetsCompleted(assets, result.file_ids.map(function (id) { return id.toString(); }), result.errors, correlationId));
        }));
        var jobUpdated$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.UpdateJob), operators_1.filter(function (a) { return a.correlationId == jobCorrelationId; }), operators_1.takeUntil(jobCompleted$), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            return dispatch(new data_providers_actions_1.ImportAssetsStatusUpdated(jobEntity.job, correlationId));
        }));
        return rxjs_1.merge(jobSuccessful$, jobUpdated$);
    };
    __decorate([
        store_1.Action(auth_actions_1.ResetState),
        immer_adapter_1.ImmutableContext()
    ], DataProvidersState.prototype, "resetState");
    __decorate([
        store_1.Action(data_providers_actions_1.LoadDataProviders),
        immer_adapter_1.ImmutableContext()
    ], DataProvidersState.prototype, "loadDataProviders");
    __decorate([
        store_1.Action(data_providers_actions_1.LoadDataProviderAssets),
        immer_adapter_1.ImmutableContext()
    ], DataProvidersState.prototype, "loadDataProviderAssets");
    __decorate([
        store_1.Action(data_providers_actions_1.SortDataProviderAssets),
        immer_adapter_1.ImmutableContext()
    ], DataProvidersState.prototype, "sortDataProviderAssets");
    __decorate([
        store_1.Action(data_providers_actions_1.ImportSelectedAssets),
        immer_adapter_1.ImmutableContext()
    ], DataProvidersState.prototype, "importSelectedAssets");
    __decorate([
        store_1.Action(data_providers_actions_1.ImportAssets),
        immer_adapter_1.ImmutableContext()
    ], DataProvidersState.prototype, "importAssets");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getState");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getDataProvidersLoaded");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getDataProviders");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getCurrentProvider");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getCurrentAssets");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getLoadingAssets");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getCurrentPathBreadcrumbs");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getCurrentSortField");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getCurrentSortOrder");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getImporting");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getImportProgress");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getLastPath");
    __decorate([
        store_1.Selector()
    ], DataProvidersState, "getImportErrors");
    DataProvidersState = __decorate([
        store_1.State({
            name: 'dataProviders',
            defaults: dataProvidersDefaultState
        })
    ], DataProvidersState);
    return DataProvidersState;
}());
exports.DataProvidersState = DataProvidersState;
