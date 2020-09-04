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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.WorkbenchState = void 0;
var store_1 = require("@ngxs/store");
var operators_1 = require("rxjs/operators");
var rxjs_1 = require("rxjs");
var paper_1 = require("paper");
var workbench_state_1 = require("./models/workbench-state");
var view_mode_1 = require("./models/view-mode");
var sidebar_view_1 = require("./models/sidebar-view");
var centroider_1 = require("./models/centroider");
var data_files_actions_1 = require("../data-files/data-files.actions");
var data_files_state_1 = require("../data-files/data-files.state");
var workbench_actions_1 = require("./workbench.actions");
var data_file_1 = require("../data-files/models/data-file");
var workbench_file_states_state_1 = require("./workbench-file-states.state");
var workbench_file_states_actions_1 = require("./workbench-file-states.actions");
var jobs_actions_1 = require("../jobs/jobs.actions");
var job_types_1 = require("../jobs/models/job-types");
var data_providers_actions_1 = require("../data-providers/data-providers.actions");
var immer_adapter_1 = require("@ngxs-labs/immer-adapter");
var data_file_type_1 = require("../data-files/models/data-file-type");
var source_1 = require("./models/source");
var marker_1 = require("./models/marker");
var sonifier_file_state_1 = require("./models/sonifier-file-state");
var sources_state_1 = require("./sources.state");
var source_extraction_settings_1 = require("./models/source-extraction-settings");
var transformation_1 = require("./models/transformation");
var jobs_state_1 = require("../jobs/jobs.state");
var sources_actions_1 = require("./sources.actions");
var phot_data_actions_1 = require("./phot-data.actions");
var auth_actions_1 = require("../auth/auth.actions");
var workbenchStateDefaults = {
    version: 1,
    showSideNav: false,
    lastRouterPath: null,
    inFullScreenMode: false,
    fullScreenPanel: 'file',
    selectedFileId: null,
    activeViewerId: null,
    activeTool: workbench_state_1.WorkbenchTool.VIEWER,
    viewMode: view_mode_1.ViewMode.SPLIT_VERTICAL,
    nextViewerIdSeed: 0,
    viewerIds: [],
    viewers: {},
    primaryViewerIds: [],
    secondaryViewerIds: [],
    viewerSyncEnabled: false,
    normalizationSyncEnabled: false,
    sidebarView: sidebar_view_1.SidebarView.FILES,
    showSidebar: true,
    showConfig: true,
    centroidSettings: {
        useDiskCentroiding: false,
        psfCentroiderSettings: centroider_1.createPsfCentroiderSettings(),
        diskCentroiderSettings: centroider_1.createDiskCentroiderSettings()
    },
    photometrySettings: {
        gain: 1,
        zeroPoint: 20,
        centroidRadius: 5,
        mode: 'constant',
        a: 5,
        b: 5,
        theta: 0,
        aIn: 10,
        aOut: 15,
        bOut: 15,
        thetaOut: 0,
        aKrFactor: 1.0,
        aInKrFactor: 1.0,
        aOutKrFactor: 1.5
    },
    sourceExtractionSettings: {
        threshold: 3,
        fwhm: 0,
        deblend: false,
        limit: 200,
        region: source_extraction_settings_1.SourceExtractionRegionOption.ENTIRE_IMAGE
    },
    customMarkerPageSettings: {
        centroidClicks: false,
        usePlanetCentroiding: false
    },
    plotterPageSettings: {
        interpolatePixels: false,
        centroidClicks: false,
        planetCentroiding: false,
        plotterSyncEnabled: false,
        plotterMode: '1D'
    },
    photometryPageSettings: {
        showSourceLabels: true,
        centroidClicks: true,
        showSourcesFromAllFiles: true,
        selectedSourceIds: [],
        coordMode: 'sky',
        autoPhot: true,
        batchPhotFormData: {
            selectedImageFileIds: []
        },
        batchPhotProgress: null,
        batchPhotJobId: null
    },
    pixelOpsPageSettings: {
        currentPixelOpsJobId: null,
        showCurrentPixelOpsJobState: true,
        pixelOpsFormData: {
            operand: '+',
            mode: 'image',
            auxImageFileId: null,
            auxImageFileIds: [],
            imageFileIds: [],
            scalarValue: 1,
            inPlace: false,
            opString: ''
        }
    },
    aligningPageSettings: {
        alignFormData: {
            selectedImageFileIds: [],
            mode: 'astrometric',
            inPlace: true
        },
        currentAlignmentJobId: null
    },
    stackingPageSettings: {
        stackFormData: {
            selectedImageFileIds: [],
            mode: 'average',
            scaling: 'none',
            rejection: 'none',
            percentile: 50,
            low: 0,
            high: 0
        },
        currentStackingJobId: null
    },
    catalogs: [],
    selectedCatalogId: null,
    fieldCals: [],
    selectedFieldCalId: null,
    addFieldCalSourcesFromCatalogJobId: null,
    creatingAddFieldCalSourcesFromCatalogJob: false,
    addFieldCalSourcesFromCatalogFieldCalId: null,
    dssImportLoading: false
};
var WorkbenchState = /** @class */ (function () {
    function WorkbenchState(store, afterglowCatalogService, afterglowFieldCalService, correlationIdGenerator, actions$) {
        this.store = store;
        this.afterglowCatalogService = afterglowCatalogService;
        this.afterglowFieldCalService = afterglowFieldCalService;
        this.correlationIdGenerator = correlationIdGenerator;
        this.actions$ = actions$;
        this.viewerIdPrefix = 'VWR';
    }
    WorkbenchState_1 = WorkbenchState;
    WorkbenchState.getState = function (state) {
        return state;
    };
    WorkbenchState.getFullScreenPanel = function (state) {
        return state.fullScreenPanel;
    };
    WorkbenchState.getInFullScreenMode = function (state) {
        return state.inFullScreenMode;
    };
    WorkbenchState.getViewerIds = function (state) {
        return state.viewerIds;
    };
    WorkbenchState.getViewerEntities = function (state) {
        return state.viewers;
    };
    WorkbenchState.getViewers = function (state) {
        return Object.values(state.viewers);
    };
    WorkbenchState.getPrimaryViewerIds = function (state) {
        return state.primaryViewerIds;
    };
    WorkbenchState.getPrimaryViewers = function (state, primaryViewerIds, viewerEntities) {
        return primaryViewerIds.map(function (id) { return viewerEntities[id]; });
    };
    WorkbenchState.getSecondaryViewerIds = function (state) {
        return state.secondaryViewerIds;
    };
    WorkbenchState.getSecondaryViewers = function (state, secondaryViewerIds, viewerEntities) {
        return secondaryViewerIds.map(function (id) { return viewerEntities[id]; });
    };
    WorkbenchState.getViewerById = function (state) {
        return function (id) {
            return state.viewers[id];
        };
    };
    WorkbenchState.getViewerFileIds = function (state, viewers) {
        return viewers.map(function (viewer) { return viewer.fileId; });
    };
    WorkbenchState.getViewerFileHeaders = function (state, fileIds, dataFiles) {
        return fileIds.map(function (fileId) { return dataFiles[fileId].header; });
    };
    WorkbenchState.getActiveFileId = function (state) {
        var activeViewer = WorkbenchState_1.getActiveViewer(state);
        if (!activeViewer || activeViewer.fileId == null)
            return null;
        return activeViewer.fileId;
    };
    WorkbenchState.getActiveFile = function (state, fileId, dataFilesState) {
        if (fileId == null)
            return null;
        return dataFilesState.entities[fileId];
    };
    WorkbenchState.getActiveFileHeader = function (state, file) {
        if (!file || !file.headerLoaded)
            return null;
        return file.header;
    };
    WorkbenchState.getActiveImageFile = function (state, file) {
        if (!file)
            return null;
        if (file.type != data_file_type_1.DataFileType.IMAGE)
            return null;
        return file;
    };
    WorkbenchState.getActiveImageFileState = function (state, imageFile, imageFilesState) {
        if (!imageFile)
            return null;
        return imageFilesState.entities[imageFile.id];
    };
    WorkbenchState.getActiveViewerId = function (state) {
        return state.activeViewerId;
    };
    WorkbenchState.getActiveViewer = function (state) {
        return state.viewers[state.activeViewerId];
    };
    WorkbenchState.getSelectedFile = function (state, dataFilesState) {
        return dataFilesState.entities[state.selectedFileId];
    };
    WorkbenchState.getShowConfig = function (state) {
        return state.showConfig;
    };
    WorkbenchState.getShowSourceLabels = function (state) {
        return state.photometryPageSettings.showSourceLabels;
    };
    WorkbenchState.getViewerSyncEnabled = function (state) {
        return state.viewerSyncEnabled;
    };
    WorkbenchState.getNormalizationSyncEnabled = function (state) {
        return state.normalizationSyncEnabled;
    };
    WorkbenchState.getDssImportLoading = function (state) {
        return state.dssImportLoading;
    };
    WorkbenchState.getViewMode = function (state) {
        return state.viewMode;
    };
    WorkbenchState.getActiveTool = function (state) {
        return state.activeTool;
    };
    WorkbenchState.getShowSidebar = function (state) {
        return state.showSidebar;
    };
    WorkbenchState.getSidebarView = function (state) {
        return state.sidebarView;
    };
    WorkbenchState.getPhotometrySettings = function (state) {
        return state.photometrySettings;
    };
    WorkbenchState.getSourceExtractionSettings = function (state) {
        return state.sourceExtractionSettings;
    };
    WorkbenchState.getCentroidSettings = function (state) {
        return state.centroidSettings;
    };
    WorkbenchState.getCustomMarkerPageSettings = function (state) {
        return state.customMarkerPageSettings;
    };
    WorkbenchState.getPlotterPageSettings = function (state) {
        return state.plotterPageSettings;
    };
    WorkbenchState.getPhotometryPageSettings = function (state) {
        return state.photometryPageSettings;
    };
    WorkbenchState.getPhotometrySelectedSourceIds = function (state) {
        return state.photometryPageSettings.selectedSourceIds;
    };
    WorkbenchState.getPhotometryCoordMode = function (state) {
        return state.photometryPageSettings.coordMode;
    };
    WorkbenchState.getPhotometryShowSourcesFromAllFiles = function (state) {
        return state.photometryPageSettings.showSourcesFromAllFiles;
    };
    WorkbenchState.getPhotometryShowSourceLabels = function (state) {
        return state.photometryPageSettings.showSourceLabels;
    };
    WorkbenchState.getPlotterMarkers = function (state, imageFilesState, dataFilesState) {
        return function (fileId) {
            var file = dataFilesState.entities[fileId];
        };
    };
    WorkbenchState.getSonifierMarkers = function (state, imageFilesState, dataFilesState) {
        return function (fileId) {
            var file = dataFilesState.entities[fileId];
            var sonifier = imageFilesState.entities[fileId].sonifier;
            var region = sonifier.regionHistory[sonifier.regionHistoryIndex];
            var regionMode = sonifier.regionMode;
            var progressLine = sonifier.progressLine;
            var result = [];
            if (region && regionMode == sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                result.push(__assign({ type: marker_1.MarkerType.RECTANGLE }, region));
            if (progressLine)
                result.push(__assign({ type: marker_1.MarkerType.LINE }, progressLine));
            return result;
        };
    };
    WorkbenchState.getPhotometrySourceMarkers = function (state, imageFilesState, dataFilesState, sourcesState) {
        return function (fileId) {
            var file = dataFilesState.entities[fileId];
            var sources = sources_state_1.SourcesState.getSources(sourcesState);
            var selectedSourceIds = state.photometryPageSettings.selectedSourceIds;
            var markers = [];
            if (!file)
                return [[]];
            var mode = state.photometryPageSettings.coordMode;
            if (!file.wcs.isValid())
                mode = 'pixel';
            sources.forEach(function (source) {
                if (source.fileId != fileId && !state.photometryPageSettings.showSourcesFromAllFiles)
                    return;
                if (source.posType != mode)
                    return;
                var selected = selectedSourceIds.includes(source.id);
                var coord = data_file_1.getSourceCoordinates(file, source);
                if (coord == null) {
                    return false;
                }
                if (source.pm) {
                    markers.push({
                        type: marker_1.MarkerType.TEARDROP,
                        x: coord.x,
                        y: coord.y,
                        radius: 15,
                        labelGap: 14,
                        labelTheta: 0,
                        label: state.photometryPageSettings.showSourceLabels ? source.label : "",
                        theta: coord.theta,
                        selected: selected,
                        data: { id: source.id }
                    });
                }
                else {
                    markers.push({
                        type: marker_1.MarkerType.CIRCLE,
                        x: coord.x,
                        y: coord.y,
                        radius: 15,
                        labelGap: 14,
                        labelTheta: 0,
                        label: state.photometryPageSettings.showSourceLabels ? source.label : "",
                        selected: selected,
                        data: { id: source.id }
                    });
                }
            });
            return markers;
        };
    };
    WorkbenchState.prototype.resetState = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        setState(function (state) {
            return workbenchStateDefaults;
        });
    };
    WorkbenchState.prototype.toggleFullScreen = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        setState(function (state) {
            state.inFullScreenMode = !state.inFullScreenMode;
            return state;
        });
    };
    WorkbenchState.prototype.setFullScreen = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var value = _b.value;
        setState(function (state) {
            state.inFullScreenMode = value;
            return state;
        });
    };
    WorkbenchState.prototype.setFullScreenPanel = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var panel = _b.panel;
        setState(function (state) {
            state.fullScreenPanel = panel;
            return state;
        });
    };
    WorkbenchState.prototype.setSidebarView = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var sidebarView = _b.sidebarView;
        setState(function (state) {
            var showSidebar = true;
            if (sidebarView == state.sidebarView) {
                showSidebar = !state.showSidebar;
            }
            state.sidebarView = sidebarView;
            state.showSidebar = showSidebar;
            return state;
        });
    };
    WorkbenchState.prototype.showSidebar = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        setState(function (state) {
            state.showSidebar = true;
            return state;
        });
    };
    WorkbenchState.prototype.hideSidebar = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        setState(function (state) {
            state.showSidebar = false;
            return state;
        });
    };
    WorkbenchState.prototype.setActiveViewer = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var viewerId = _b.viewerId;
        setState(function (state) {
            state.activeViewerId = viewerId;
            return state;
        });
    };
    WorkbenchState.prototype.createViewer = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var viewer = _b.viewer, usePrimary = _b.usePrimary;
        setState(function (state) {
            var id = _this.viewerIdPrefix + state.nextViewerIdSeed++;
            state.viewers[id] = __assign(__assign({}, viewer), { viewerId: id });
            state.viewerIds.push(id);
            if (usePrimary) {
                state.primaryViewerIds.push(id);
            }
            else {
                state.secondaryViewerIds.push(id);
            }
            state.activeViewerId = id;
            if (viewer.fileId)
                dispatch(new workbench_actions_1.SetViewerFile(id, viewer.fileId));
            return state;
        });
    };
    WorkbenchState.prototype.closeViewer = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var viewerId = _b.viewerId;
        setState(function (state) {
            var activeViewerIndex = state.viewerIds.indexOf(state.activeViewerId);
            state.viewerIds = state.viewerIds.filter(function (id) { return id != viewerId; });
            if (viewerId in state.viewers)
                delete state.viewers[viewerId];
            state.primaryViewerIds = state.primaryViewerIds.filter(function (id) { return id != viewerId; });
            state.secondaryViewerIds = state.secondaryViewerIds.filter(function (id) { return id != viewerId; });
            state.activeViewerId = state.viewerIds.length == 0 ? null : state.viewerIds[Math.max(0, Math.min(state.viewerIds.length - 1, activeViewerIndex))];
            if (state.primaryViewerIds.length == 0) {
                state.primaryViewerIds = __spreadArrays(state.secondaryViewerIds);
                state.secondaryViewerIds = [];
            }
            return state;
        });
    };
    WorkbenchState.prototype.keepViewerOpen = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var viewerId = _b.viewerId;
        setState(function (state) {
            if (viewerId in state.viewers)
                state.viewers[viewerId].keepOpen = true;
            return state;
        });
    };
    WorkbenchState.prototype.moveToOtherView = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var viewerId = _b.viewerId;
        setState(function (state) {
            if (state.primaryViewerIds.includes(viewerId)) {
                state.primaryViewerIds = state.primaryViewerIds.filter(function (id) { return id != viewerId; });
                state.secondaryViewerIds.push(viewerId);
            }
            else if (state.secondaryViewerIds.includes(viewerId)) {
                state.secondaryViewerIds = state.secondaryViewerIds.filter(function (id) { return id != viewerId; });
                state.primaryViewerIds.push(viewerId);
            }
            return state;
        });
    };
    WorkbenchState.prototype.setViewMode = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var viewMode = _b.viewMode;
        setState(function (state) {
            // let primaryViewerId = WorkbenchState.getViewers(state)[0].viewerId;
            // let secondaryViewerId = WorkbenchState.getViewers(state)[1].viewerId;
            // let activeViewerId = state.activeViewerId;
            // if (viewMode == ViewMode.SINGLE) state.activeViewerId = primaryViewerId;
            state.viewMode = viewMode;
            // state.viewers[secondaryViewerId].hidden = viewMode == ViewMode.SINGLE;
            return state;
        });
    };
    WorkbenchState.prototype.setViewerMarkers = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var viewerId = _b.viewerId, markers = _b.markers;
        setState(function (state) {
            state.viewers[viewerId].markers = markers;
            return state;
        });
    };
    WorkbenchState.prototype.clearViewerMarkers = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        setState(function (state) {
            state.viewerIds.forEach(function (viewerId) { return state.viewers[viewerId].markers = []; });
            return state;
        });
    };
    WorkbenchState.prototype.setViewerFile = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var viewerId = _b.viewerId, fileId = _b.fileId;
        var state = getState();
        var viewer = state.viewers[viewerId];
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        var actions = [];
        var dataFile = dataFiles[fileId];
        if (dataFile && viewer) {
            var originalFileId_1;
            setState(function (state) {
                originalFileId_1 = state.viewers[viewerId].fileId;
                state.viewers[viewerId].fileId = fileId;
                return state;
            });
            if (dataFile.headerLoaded && dataFile.histLoaded) {
                var referenceFileId = originalFileId_1;
                if (referenceFileId == null) {
                    var referenceViewer = WorkbenchState_1.getViewers(state).find(function (viewer, index) {
                        return viewer.viewerId != viewerId && viewer.fileId != null;
                    });
                    if (referenceViewer)
                        referenceFileId = referenceViewer.fileId;
                }
                //normalization
                var imageFileStates = this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities);
                var normalization = imageFileStates[dataFile.id].normalization;
                if (state.normalizationSyncEnabled && referenceFileId) {
                    actions.push(new workbench_actions_1.SyncFileNormalizations(dataFiles[referenceFileId], [dataFile]));
                }
                else if (!normalization.initialized) {
                    // //calculate good defaults based on histogram
                    // let levels = calcLevels(
                    //   dataFile.hist,
                    //   environment.lowerPercentileDefault,
                    //   environment.upperPercentileDefault,
                    //   true
                    // );
                    actions.push(new workbench_file_states_actions_1.RenormalizeImageFile(dataFile.id));
                }
                var sonifierState = imageFileStates[dataFile.id].sonifier;
                if (!sonifierState.regionHistoryInitialized) {
                    actions.push(new workbench_file_states_actions_1.AddRegionToHistory(dataFile.id, {
                        x: 0.5,
                        y: 0.5,
                        width: data_file_1.getWidth(dataFile),
                        height: data_file_1.getHeight(dataFile)
                    }));
                }
                if (referenceFileId) {
                    //sync pending file transformation to current file
                    if (state.viewerSyncEnabled)
                        actions.push(new workbench_actions_1.SyncFileTransformations(dataFiles[referenceFileId], [dataFile]));
                    if (state.plotterPageSettings.plotterSyncEnabled)
                        actions.push(new workbench_actions_1.SyncFilePlotters(dataFiles[referenceFileId], [dataFile]));
                }
                return dispatch(actions);
            }
            else {
                actions.push(new data_files_actions_1.LoadDataFile(fileId));
                var cancel$ = this.actions$.pipe(store_1.ofActionDispatched(workbench_actions_1.SetViewerFile), operators_1.filter(function (action) { return action.viewerId == viewerId && action.fileId != fileId; }));
                var next$ = this.actions$.pipe(store_1.ofActionCompleted(data_files_actions_1.LoadDataFile), operators_1.takeUntil(cancel$), operators_1.filter(function (r) { return r.action.fileId == fileId; }), operators_1.take(1), operators_1.filter(function (r) { return r.result.successful; }), operators_1.flatMap(function (action) { return dispatch(new workbench_actions_1.SetViewerFile(viewerId, fileId)); }));
                return rxjs_1.merge(dispatch(actions), next$);
            }
        }
    };
    WorkbenchState.prototype.setViewerSyncEnabled = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var value = _b.value;
        setState(function (state) {
            state.viewerSyncEnabled = value;
            return state;
        });
        var state = getState();
        var activeViewer = WorkbenchState_1.getActiveViewer(state);
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        var actions = [];
        var referenceFile = dataFiles[state.viewers[state.activeViewerId].fileId];
        var files = WorkbenchState_1.getViewers(state)
            .filter(function (viewer, index) {
            return viewer.viewerId != state.activeViewerId && viewer.fileId !== null;
        })
            .map(function (viewer) { return dataFiles[viewer.fileId]; });
        if (referenceFile && files.length != 0) {
            if (state.viewerSyncEnabled)
                actions.push(new workbench_actions_1.SyncFileTransformations(referenceFile, files));
        }
        return dispatch(actions);
    };
    WorkbenchState.prototype.setNormalizationSyncEnabled = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var value = _b.value;
        setState(function (state) {
            state.normalizationSyncEnabled = value;
            return state;
        });
        var state = getState();
        var activeViewer = WorkbenchState_1.getActiveViewer(state);
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        var actions = [];
        var referenceFile = dataFiles[state.viewers[state.activeViewerId].fileId];
        var files = WorkbenchState_1.getViewers(state)
            .filter(function (viewer, index) {
            return viewer.viewerId != state.activeViewerId && viewer.fileId !== null;
        })
            .map(function (viewer) { return dataFiles[viewer.fileId]; });
        if (referenceFile && files.length != 0) {
            if (state.normalizationSyncEnabled)
                actions.push(new workbench_actions_1.SyncFileNormalizations(referenceFile, files));
        }
        return dispatch(actions);
    };
    WorkbenchState.prototype.setShowConfig = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var showConfig = _b.showConfig;
        setState(function (state) {
            state.showConfig = showConfig;
            return state;
        });
    };
    WorkbenchState.prototype.toggleShowConfig = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        setState(function (state) {
            state.showConfig = !state.showConfig;
            return state;
        });
    };
    WorkbenchState.prototype.setActiveTool = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var tool = _b.tool;
        setState(function (state) {
            state.activeTool = tool;
            return state;
        });
    };
    WorkbenchState.prototype.updateCentroidSettings = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var changes = _b.changes;
        setState(function (state) {
            state.centroidSettings = __assign(__assign({}, state.centroidSettings), changes);
            return state;
        });
    };
    WorkbenchState.prototype.updatePhotometrySettings = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var changes = _b.changes;
        setState(function (state) {
            state.photometrySettings = __assign(__assign({}, state.photometrySettings), changes);
            return state;
        });
    };
    WorkbenchState.prototype.updateSourceExtractionSettings = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var changes = _b.changes;
        setState(function (state) {
            state.sourceExtractionSettings = __assign(__assign({}, state.sourceExtractionSettings), changes);
            return state;
        });
    };
    WorkbenchState.prototype.updateCustomMarkerPageSettings = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var changes = _b.changes;
        setState(function (state) {
            state.customMarkerPageSettings = __assign(__assign({}, state.customMarkerPageSettings), changes);
            return state;
        });
    };
    WorkbenchState.prototype.updatePlotterPageSettings = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var changes = _b.changes;
        setState(function (state) {
            state.plotterPageSettings = __assign(__assign({}, state.plotterPageSettings), changes);
            return state;
        });
    };
    WorkbenchState.prototype.updatePhotometryPageSettings = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var changes = _b.changes;
        setState(function (state) {
            state.photometryPageSettings = __assign(__assign({}, state.photometryPageSettings), changes);
            return state;
        });
    };
    WorkbenchState.prototype.updatePixelOpsPageSettings = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var changes = _b.changes;
        setState(function (state) {
            state.pixelOpsPageSettings = __assign(__assign({}, state.pixelOpsPageSettings), changes);
            return state;
        });
    };
    WorkbenchState.prototype.updateStackingPageSettings = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var changes = _b.changes;
        setState(function (state) {
            state.stackingPageSettings = __assign(__assign({}, state.stackingPageSettings), changes);
            return state;
        });
    };
    WorkbenchState.prototype.updateAligningPageSettings = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var changes = _b.changes;
        setState(function (state) {
            state.aligningPageSettings = __assign(__assign({}, state.aligningPageSettings), changes);
            return state;
        });
    };
    WorkbenchState.prototype.setSelectedCatalog = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var catalogId = _b.catalogId;
        setState(function (state) {
            state.selectedCatalogId = catalogId;
            return state;
        });
    };
    WorkbenchState.prototype.setSelectedFieldCal = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fieldCalId = _b.fieldCalId;
        setState(function (state) {
            state.selectedFieldCalId = fieldCalId;
            return state;
        });
    };
    WorkbenchState.prototype.closeSideNav = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        setState(function (state) {
            state.showSideNav = false;
            return state;
        });
    };
    WorkbenchState.prototype.openSideNav = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        setState(function (state) {
            state.showSideNav = true;
            return state;
        });
    };
    WorkbenchState.prototype.loadLibrarySuccess = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var dataFiles = _b.dataFiles, correlationId = _b.correlationId;
        var state = getState();
        var existingIds = this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getIds);
        var dataFileEntities = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        var imageFileStateEntities = this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities);
        var newIds = dataFiles.filter(function (dataFile) { return dataFile.type == data_file_type_1.DataFileType.IMAGE; })
            .map(function (imageFile) { return imageFile.id; })
            .filter(function (id) { return !existingIds.includes(id); });
        dispatch(new workbench_file_states_actions_1.InitializeImageFileState(newIds));
        var activeViewer = WorkbenchState_1.getActiveViewer(state);
        if (!activeViewer ||
            !activeViewer.fileId ||
            (dataFiles.map(function (f) { return f.id; }).indexOf(activeViewer.fileId) == -1 &&
                dataFiles.length != 0) ||
            (dataFileEntities[activeViewer.fileId] && dataFileEntities[activeViewer.fileId].type == data_file_type_1.DataFileType.IMAGE && !imageFileStateEntities[activeViewer.fileId].normalization.initialized)) {
            if (dataFiles[0]) {
                dispatch(new workbench_actions_1.SelectDataFile(dataFiles[0].id));
            }
        }
    };
    WorkbenchState.prototype.removeDataFile = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        setState(function (state) {
            WorkbenchState_1.getViewers(state).forEach(function (v) {
                if (v.fileId == fileId)
                    v.fileId = null;
            });
            return state;
        });
        if (getState().selectedFileId == fileId) {
            var dataFiles_1 = this.store.selectSnapshot(data_files_state_1.DataFilesState.getDataFiles);
            var index_1 = dataFiles_1.map(function (f) { return f.id; }).indexOf(fileId);
            if (index_1 != -1 && dataFiles_1.length != 1) {
                this.actions$.pipe(store_1.ofActionCompleted(data_files_actions_1.RemoveDataFile), operators_1.take(1), operators_1.filter(function (a) { return a.result.successful; })).subscribe(function () {
                    dataFiles_1 = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getDataFiles);
                    var nextFile = dataFiles_1[Math.max(0, Math.min(dataFiles_1.length - 1, index_1))];
                    if (nextFile)
                        dispatch(new workbench_actions_1.SelectDataFile(nextFile.id));
                });
            }
        }
    };
    WorkbenchState.prototype.removeDataFileSuccess = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        setState(function (state) {
            if (state.selectedFileId == fileId)
                state.selectedFileId = null;
            state.aligningPageSettings.alignFormData.selectedImageFileIds = state.aligningPageSettings.alignFormData.selectedImageFileIds.filter(function (fileId) { return fileId != fileId; });
            state.pixelOpsPageSettings.pixelOpsFormData.imageFileIds = state.pixelOpsPageSettings.pixelOpsFormData.imageFileIds.filter(function (fileId) { return fileId != fileId; });
            state.pixelOpsPageSettings.pixelOpsFormData.auxImageFileIds = state.pixelOpsPageSettings.pixelOpsFormData.auxImageFileIds.filter(function (fileId) { return fileId != fileId; });
            state.pixelOpsPageSettings.pixelOpsFormData.auxImageFileId = state.pixelOpsPageSettings.pixelOpsFormData.auxImageFileId == fileId ? null : state.pixelOpsPageSettings.pixelOpsFormData.auxImageFileId;
            return state;
        });
        var state = getState();
        var activeViewer = WorkbenchState_1.getActiveViewer(state);
        // if (activeViewer && activeViewer.fileId == fileId) {
        //   dispatch(new SelectDataFile(null));
        // }
    };
    WorkbenchState.prototype.selectDataFile = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        var state = getState();
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        if (fileId != null) {
            var dataFile = dataFiles[fileId];
            var viewers = WorkbenchState_1.getViewers(state);
            //check if file is already open
            var targetViewer = viewers.find(function (viewer) { return viewer.fileId == fileId; });
            if (targetViewer) {
                dispatch(new workbench_actions_1.SetActiveViewer(targetViewer.viewerId));
                return;
            }
            //check if existing viewer is available
            targetViewer = viewers.find(function (viewer) { return !viewer.keepOpen; });
            if (targetViewer) {
                //temporary viewer exists
                dispatch(new workbench_actions_1.SetViewerFile(targetViewer.viewerId, dataFile.id));
                dispatch(new workbench_actions_1.SetActiveViewer(targetViewer.viewerId));
                return;
            }
            var useSecondary = state.secondaryViewerIds.includes(state.activeViewerId);
            var viewer = {
                viewerId: null,
                fileId: fileId,
                panEnabled: true,
                zoomEnabled: true,
                markers: [],
                keepOpen: false
            };
            dispatch(new workbench_actions_1.CreateViewer(viewer, !useSecondary));
        }
        setState(function (state) {
            state.selectedFileId = fileId;
            return state;
        });
    };
    WorkbenchState.prototype.onTransformChange = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        var state = getState();
        var activeViewer = WorkbenchState_1.getActiveViewer(state);
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        if (!state.viewerSyncEnabled ||
            !activeViewer ||
            activeViewer.fileId != fileId) {
            return;
        }
        var referenceFile = dataFiles[activeViewer.fileId];
        var files = WorkbenchState_1.getViewers(state)
            .filter(function (viewer, index) {
            return viewer.viewerId != state.activeViewerId && viewer.fileId !== null;
        })
            .map(function (viewer) { return dataFiles[viewer.fileId]; });
        return dispatch(new workbench_actions_1.SyncFileTransformations(referenceFile, files));
    };
    WorkbenchState.prototype.onNormalizationChange = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, changes = _b.changes;
        var state = getState();
        var activeViewer = WorkbenchState_1.getActiveViewer(state);
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        if (!state.normalizationSyncEnabled ||
            !activeViewer ||
            activeViewer.fileId != fileId)
            return;
        var referenceFile = dataFiles[activeViewer.fileId];
        var files = WorkbenchState_1.getViewers(state)
            .filter(function (viewer, index) {
            return viewer.viewerId != state.activeViewerId && viewer.fileId !== null;
        })
            .map(function (viewer) { return dataFiles[viewer.fileId]; });
        return dispatch(new workbench_actions_1.SyncFileNormalizations(referenceFile, files));
    };
    WorkbenchState.prototype.onPlotterChange = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        var state = getState();
        var activeViewer = WorkbenchState_1.getActiveViewer(state);
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        if (!state.plotterPageSettings.plotterSyncEnabled ||
            !activeViewer ||
            activeViewer.fileId != fileId)
            return;
        var referenceFile = dataFiles[activeViewer.fileId];
        var files = WorkbenchState_1.getViewers(state)
            .filter(function (viewer, index) {
            return viewer.viewerId != state.activeViewerId && viewer.fileId !== null;
        })
            .map(function (viewer) { return dataFiles[viewer.fileId]; });
        return dispatch(new workbench_actions_1.SyncFilePlotters(referenceFile, files));
    };
    WorkbenchState.prototype.syncFileNormalizations = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var reference = _b.reference, files = _b.files;
        var state = getState();
        var imageFileStates = this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities);
        var srcFile = reference;
        if (!srcFile)
            return;
        var targetFiles = files;
        var srcNormalizer = imageFileStates[srcFile.id].normalization.normalizer;
        var actions = [];
        targetFiles.forEach(function (targetFile) {
            if (!targetFile || targetFile.id == srcFile.id)
                return;
            actions.push(new workbench_file_states_actions_1.UpdateNormalizer(targetFile.id, __assign(__assign({}, srcNormalizer), { peakPercentile: srcNormalizer.peakPercentile, backgroundPercentile: srcNormalizer.backgroundPercentile })));
        });
        return dispatch(actions);
    };
    WorkbenchState.prototype.syncFilePlotters = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var reference = _b.reference, files = _b.files;
        var state = getState();
        var imageFileStates = this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities);
        var srcFile = reference;
        var targetFiles = files;
        var srcPlotter = imageFileStates[srcFile.id].plotter;
        targetFiles.forEach(function (targetFile) {
            if (!targetFile || targetFile.id == srcFile.id)
                return;
            return dispatch(new workbench_file_states_actions_1.UpdatePlotterFileState(targetFile.id, __assign({}, srcPlotter)));
        });
    };
    WorkbenchState.prototype.syncFileTransformations = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var reference = _b.reference, files = _b.files;
        var state = getState();
        var imageFileStates = this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities);
        var actions = [];
        var srcFile = reference;
        var targetFiles = files;
        if (!srcFile)
            return;
        var srcHasWcs = srcFile.wcs.isValid();
        var srcImageTransform = imageFileStates[srcFile.id].transformation.imageTransform;
        var srcViewportTransform = imageFileStates[srcFile.id].transformation.viewportTransform;
        targetFiles.forEach(function (targetFile) {
            if (!targetFile || targetFile.id == srcFile.id)
                return;
            var targetHasWcs = targetFile.wcs.isValid();
            if (srcHasWcs && targetHasWcs) {
                var srcWcs = srcFile.wcs;
                var srcWcsTransform = new paper_1.Matrix(srcWcs.m11, srcWcs.m21, srcWcs.m12, srcWcs.m22, 0, 0);
                var originWorld = srcWcs.pixToWorld([0, 0]);
                var targetWcs = targetFile.wcs;
                var originPixels = targetWcs.worldToPix(originWorld);
                var targetWcsTransform = new paper_1.Matrix(targetWcs.m11, targetWcs.m21, targetWcs.m12, targetWcs.m22, 0, 0);
                var targetImageFileState = imageFileStates[targetFile.id];
                if (data_file_1.hasOverlap(srcFile, targetFile)) {
                    var srcToTargetTransform = srcWcsTransform
                        .inverted()
                        .appended(targetWcsTransform)
                        .translate(-originPixels[0], -originPixels[1]);
                    var targetImageMatrix = transformation_1.transformToMatrix(imageFileStates[srcFile.id].transformation.imageTransform).appended(srcToTargetTransform);
                    actions.push(new workbench_file_states_actions_1.SetImageTransform(targetFile.id, transformation_1.matrixToTransform(targetImageMatrix)));
                    actions.push(new workbench_file_states_actions_1.SetViewportTransform(targetFile.id, imageFileStates[srcFile.id].transformation.viewportTransform));
                }
            }
            else {
                var targetImageFileState = imageFileStates[targetFile.id];
                actions.push(new workbench_file_states_actions_1.SetImageTransform(targetFile.id, srcImageTransform));
                actions.push(new workbench_file_states_actions_1.SetViewportTransform(targetFile.id, srcViewportTransform));
            }
        });
        return dispatch(actions);
    };
    WorkbenchState.prototype.loadCatalogs = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        return this.afterglowCatalogService.getCatalogs().pipe(operators_1.tap(function (catalogs) {
            setState(function (state) {
                state.catalogs = catalogs;
                state.selectedCatalogId = catalogs.length != 0 ? catalogs[0].name : null;
                return state;
            });
        }), operators_1.flatMap(function (catalogs) {
            return dispatch(new workbench_actions_1.LoadCatalogsSuccess(catalogs));
        }), operators_1.catchError(function (err) {
            return dispatch(new workbench_actions_1.LoadCatalogsFail(err));
        }));
    };
    WorkbenchState.prototype.loadFieldCals = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        return this.afterglowFieldCalService.getFieldCals().pipe(operators_1.tap(function (fieldCals) {
            setState(function (state) {
                state.fieldCals = fieldCals;
                state.selectedFieldCalId = state.selectedFieldCalId == null ? (fieldCals.length == 0 ? null : fieldCals[0].id) : state.selectedFieldCalId;
                return state;
            });
        }), operators_1.flatMap(function (fieldCals) {
            return dispatch(new workbench_actions_1.LoadFieldCalsSuccess(fieldCals));
        }), operators_1.catchError(function (err) {
            return dispatch(new workbench_actions_1.LoadFieldCalsFail(err));
        }));
    };
    WorkbenchState.prototype.createFieldCal = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fieldCal = _b.fieldCal;
        return this.afterglowFieldCalService.createFieldCal(fieldCal).pipe(operators_1.tap(function (fieldCal) {
            setState(function (state) {
                state.selectedFieldCalId = fieldCal.id;
                return state;
            });
        }), operators_1.flatMap(function (fieldCal) {
            return dispatch([new workbench_actions_1.CreateFieldCalSuccess(fieldCal), new workbench_actions_1.LoadFieldCals()]);
        }), operators_1.catchError(function (err) {
            return dispatch(new workbench_actions_1.CreateFieldCalFail(err));
        }));
    };
    WorkbenchState.prototype.updateFieldCal = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fieldCal = _b.fieldCal;
        return this.afterglowFieldCalService.updateFieldCal(fieldCal).pipe(operators_1.tap(function (fieldCal) {
        }), operators_1.flatMap(function (fieldCal) {
            return dispatch([new workbench_actions_1.UpdateFieldCalSuccess(fieldCal), new workbench_actions_1.LoadFieldCals()]);
        }), operators_1.catchError(function (err) {
            return dispatch(new workbench_actions_1.UpdateFieldCalFail(err));
        }));
    };
    WorkbenchState.prototype.addFieldCalSourcesFromCatalog = function (_a, _b) {
        // let correlationId = this.correlationIdGenerator.next();
        // let createJobAction = new CreateJob(catalogQueryJob, 1000, correlationId)
        // let { jobCreated$, jobUpdated$, jobCompleted$ } = JobActionHandler.getJobStreams(correlationId, this.actions$);
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fieldCalId = _b.fieldCalId, catalogQueryJob = _b.catalogQueryJob;
        // return merge(
        //   dispatch(createJobAction),
        //   jobCompleted$.pipe(
        //     tap(jobCompleted => {
        //       let result = jobCompleted.result as CatalogQueryJobResult;
        //       setState((state: WorkbenchStateModel) => {
        //         let fieldCal = state.fieldCals.find(c => c.id == fieldCalId);
        //         if (fieldCal) {
        //           fieldCal.catalogSources = fieldCal.catalogSources.concat(result.data);
        //         }
        //         return state;
        //       });
        //     })
        //   )
        // );
    };
    WorkbenchState.prototype.createPixelOpsJob = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var state = getState();
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getDataFiles);
        var data = state.pixelOpsPageSettings.pixelOpsFormData;
        var imageFiles = data.imageFileIds.map(function (id) { return dataFiles.find(function (f) { return f.id == id; }); }).filter(function (f) { return f != null; });
        var auxFileIds = [];
        var op;
        if (data.mode == 'scalar') {
            op = "img " + data.operand + " " + data.scalarValue;
        }
        else {
            op = "img " + data.operand + " aux_img";
            auxFileIds.push(parseInt(data.auxImageFileId));
        }
        var job = {
            type: job_types_1.JobType.PixelOps,
            id: null,
            file_ids: imageFiles.sort(function (a, b) { return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0; }).map(function (f) { return parseInt(f.id); }),
            aux_file_ids: auxFileIds,
            op: op,
            inplace: data.inPlace
        };
        var correlationId = this.correlationIdGenerator.next();
        dispatch(new jobs_actions_1.CreateJob(job, 1000, correlationId));
        var jobCompleted$ = this.actions$.pipe(store_1.ofActionCompleted(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobCanceled$ = this.actions$.pipe(store_1.ofActionCanceled(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobErrored$ = this.actions$.pipe(store_1.ofActionErrored(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobSuccessful$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.correlationId == correlationId; }), operators_1.takeUntil(rxjs_1.merge(jobCanceled$, jobErrored$)), operators_1.take(1), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            var result = jobEntity.result;
            if (result.errors.length != 0) {
                console.error("Errors encountered during pixel ops job: ", result.errors);
            }
            if (result.warnings.length != 0) {
                console.error("Warnings encountered during pixel ops job: ", result.warnings);
            }
            dispatch(new data_files_actions_1.LoadLibrary());
        }));
        var jobUpdated$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.UpdateJob), operators_1.filter(function (a) { return a.correlationId == correlationId; }), operators_1.takeUntil(jobCompleted$), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            setState(function (state) {
                state.pixelOpsPageSettings.currentPixelOpsJobId = jobEntity.job.id;
                return state;
            });
        }));
        return rxjs_1.merge(jobSuccessful$, jobUpdated$);
    };
    WorkbenchState.prototype.createAdvPixelOpsJob = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var state = getState();
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getDataFiles);
        var data = state.pixelOpsPageSettings.pixelOpsFormData;
        var imageFiles = data.imageFileIds.map(function (id) { return dataFiles.find(function (f) { return f.id == id; }); }).filter(function (f) { return f != null; });
        var auxImageFiles = data.auxImageFileIds.map(function (id) { return dataFiles.find(function (f) { return f.id == id; }); }).filter(function (f) { return f != null; });
        var job = {
            type: job_types_1.JobType.PixelOps,
            id: null,
            file_ids: imageFiles.sort(function (a, b) { return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0; }).map(function (f) { return parseInt(f.id); }),
            aux_file_ids: auxImageFiles.sort(function (a, b) { return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0; }).map(function (f) { return parseInt(f.id); }),
            op: data.opString,
            inplace: data.inPlace
        };
        var correlationId = this.correlationIdGenerator.next();
        dispatch(new jobs_actions_1.CreateJob(job, 1000, correlationId));
        var jobCompleted$ = this.actions$.pipe(store_1.ofActionCompleted(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobCanceled$ = this.actions$.pipe(store_1.ofActionCanceled(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobErrored$ = this.actions$.pipe(store_1.ofActionErrored(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobSuccessful$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.correlationId == correlationId; }), operators_1.takeUntil(rxjs_1.merge(jobCanceled$, jobErrored$)), operators_1.take(1), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            var result = jobEntity.result;
            if (result.errors.length != 0) {
                console.error("Errors encountered during pixel ops: ", result.errors);
            }
            if (result.warnings.length != 0) {
                console.error("Warnings encountered during pixel ops: ", result.warnings);
            }
            dispatch(new data_files_actions_1.LoadLibrary());
        }));
        var jobUpdated$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.UpdateJob), operators_1.filter(function (a) { return a.correlationId == correlationId; }), operators_1.takeUntil(jobCompleted$), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            setState(function (state) {
                state.pixelOpsPageSettings.currentPixelOpsJobId = jobEntity.job.id;
                return state;
            });
        }));
        return rxjs_1.merge(jobSuccessful$, jobUpdated$);
    };
    WorkbenchState.prototype.createAlignmentJob = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var state = getState();
        var data = state.aligningPageSettings.alignFormData;
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getDataFiles);
        var imageFiles = data.selectedImageFileIds.map(function (id) { return dataFiles.find(function (f) { return f.id == id; }); }).filter(function (f) { return f != null; });
        var job = {
            type: job_types_1.JobType.Alignment,
            id: null,
            file_ids: imageFiles.sort(function (a, b) { return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0; }).map(function (f) { return parseInt(f.id); }),
            inplace: data.inPlace
        };
        var correlationId = this.correlationIdGenerator.next();
        dispatch(new jobs_actions_1.CreateJob(job, 1000, correlationId));
        var jobCompleted$ = this.actions$.pipe(store_1.ofActionCompleted(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobCanceled$ = this.actions$.pipe(store_1.ofActionCanceled(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobErrored$ = this.actions$.pipe(store_1.ofActionErrored(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobSuccessful$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.correlationId == correlationId; }), operators_1.takeUntil(rxjs_1.merge(jobCanceled$, jobErrored$)), operators_1.take(1), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            var result = jobEntity.result;
            if (result.errors.length != 0) {
                console.error("Errors encountered during aligning: ", result.errors);
            }
            if (result.warnings.length != 0) {
                console.error("Warnings encountered during aligning: ", result.warnings);
            }
            var fileIds = result.file_ids.map(function (id) { return id.toString(); });
            var actions = [];
            if (jobEntity.job.inplace) {
                actions.push(new data_files_actions_1.ClearImageDataCache(fileIds));
            }
            else {
                actions.push(new data_files_actions_1.LoadLibrary());
            }
            WorkbenchState_1.getViewers(getState()).forEach(function (viewer, index) {
                if (fileIds.includes(viewer.fileId)) {
                    actions.push(new workbench_actions_1.SetViewerFile(viewer.viewerId, viewer.fileId));
                }
            });
            return dispatch(actions);
        }));
        var jobUpdated$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.UpdateJob), operators_1.filter(function (a) { return a.correlationId == correlationId; }), operators_1.takeUntil(jobCompleted$), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            setState(function (state) {
                state.aligningPageSettings.currentAlignmentJobId = jobEntity.job.id;
                return state;
            });
        }));
        return rxjs_1.merge(jobSuccessful$, jobUpdated$);
    };
    WorkbenchState.prototype.createStackingJob = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var state = getState();
        var data = state.stackingPageSettings.stackFormData;
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getDataFiles);
        var imageFiles = data.selectedImageFileIds.map(function (id) { return dataFiles.find(function (f) { return f.id == id; }); }).filter(function (f) { return f != null; });
        var job = {
            type: job_types_1.JobType.Stacking,
            id: null,
            file_ids: imageFiles.sort(function (a, b) { return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0; }).map(function (f) { return parseInt(f.id); }),
            stacking_settings: {
                mode: data.mode,
                scaling: data.scaling == 'none' ? null : data.scaling,
                rejection: data.rejection == 'none' ? null : data.rejection,
                percentile: data.percentile,
                lo: data.low,
                hi: data.high
            }
        };
        var correlationId = this.correlationIdGenerator.next();
        dispatch(new jobs_actions_1.CreateJob(job, 1000, correlationId));
        var jobCompleted$ = this.actions$.pipe(store_1.ofActionCompleted(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobCanceled$ = this.actions$.pipe(store_1.ofActionCanceled(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobErrored$ = this.actions$.pipe(store_1.ofActionErrored(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobSuccessful$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.correlationId == correlationId; }), operators_1.takeUntil(rxjs_1.merge(jobCanceled$, jobErrored$)), operators_1.take(1), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            var result = jobEntity.result;
            if (result.errors.length != 0) {
                console.error("Errors encountered during stacking: ", result.errors);
            }
            if (result.warnings.length != 0) {
                console.error("Warnings encountered during stacking: ", result.warnings);
            }
            dispatch(new data_files_actions_1.LoadLibrary());
        }));
        var jobUpdated$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.UpdateJob), operators_1.filter(function (a) { return a.correlationId == correlationId; }), operators_1.takeUntil(jobCompleted$), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            setState(function (state) {
                state.stackingPageSettings.currentStackingJobId = jobEntity.job.id;
                return state;
            });
        }));
        return rxjs_1.merge(jobSuccessful$, jobUpdated$);
    };
    WorkbenchState.prototype.importFromSurvey = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var surveyDataProviderId = _b.surveyDataProviderId, raHours = _b.raHours, decDegs = _b.decDegs, widthArcmins = _b.widthArcmins, heightArcmins = _b.heightArcmins, imageFileId = _b.imageFileId, correlationId = _b.correlationId;
        var importFromSurveyCorrId = this.correlationIdGenerator.next();
        setState(function (state) {
            state.dssImportLoading = true;
            return state;
        });
        var importCompleted$ = this.actions$.pipe(store_1.ofActionDispatched(data_providers_actions_1.ImportAssetsCompleted), operators_1.filter(function (action) { return action.correlationId == importFromSurveyCorrId; }), operators_1.take(1), operators_1.flatMap(function (action) {
            dispatch(new data_files_actions_1.LoadLibrary());
            dispatch(new workbench_actions_1.ImportFromSurveySuccess());
            var state = getState();
            var viewers = WorkbenchState_1.getViewers(state);
            var targetViewer = viewers.find(function (v) { return v.viewerId != state.activeViewerId; });
            return _this.actions$.pipe(store_1.ofActionCompleted(data_files_actions_1.LoadLibrary), operators_1.take(1), operators_1.filter(function (loadLibraryAction) { return loadLibraryAction.result.successful; }), operators_1.tap(function (loadLibraryAction) {
                setState(function (state) {
                    state.dssImportLoading = false;
                    return state;
                });
                if (targetViewer) {
                    // if(getState().viewMode == ViewMode.SINGLE ) {
                    //   dispatch(new SetViewMode(ViewMode.SPLIT_VERTICAL));
                    // }
                    dispatch(new workbench_actions_1.SetActiveViewer(targetViewer.viewerId));
                    dispatch(new workbench_actions_1.SelectDataFile((action.fileIds[0].toString())));
                }
            }));
        }));
        dispatch(new data_providers_actions_1.ImportAssets(surveyDataProviderId, [
            {
                name: "",
                collection: false,
                path: "DSS\\" + raHours * 15 + "," + decDegs + "\\" + widthArcmins + "," + heightArcmins,
                metadata: {}
            }
        ], importFromSurveyCorrId));
        return importCompleted$;
    };
    /* Source Extraction */
    WorkbenchState.prototype.extractSources = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, settings = _b.settings;
        var state = getState();
        var photometryPageSettings = this.store.selectSnapshot(WorkbenchState_1.getPhotometryPageSettings);
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        var imageFile = dataFiles[fileId];
        var imageFileState = this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[imageFile.id];
        var sonifier = imageFileState.sonifier;
        var jobSettings = {
            threshold: settings.threshold,
            fwhm: settings.fwhm,
            deblend: settings.deblend,
            limit: settings.limit
        };
        if (settings.region == source_extraction_settings_1.SourceExtractionRegionOption.VIEWPORT || (settings.region == source_extraction_settings_1.SourceExtractionRegionOption.SONIFIER_REGION && imageFileState.sonifier.regionMode == sonifier_file_state_1.SonifierRegionMode.VIEWPORT)) {
            var region = transformation_1.getViewportRegion(imageFileState.transformation, imageFile);
            jobSettings = __assign(__assign({}, jobSettings), { x: Math.min(data_file_1.getWidth(imageFile), Math.max(0, region.x + 1)), y: Math.min(data_file_1.getHeight(imageFile), Math.max(0, region.y + 1)), width: Math.min(data_file_1.getWidth(imageFile), Math.max(0, region.width + 1)), height: Math.min(data_file_1.getHeight(imageFile), Math.max(0, region.height + 1)) });
        }
        else if (settings.region == source_extraction_settings_1.SourceExtractionRegionOption.SONIFIER_REGION && imageFileState.sonifier.regionMode == sonifier_file_state_1.SonifierRegionMode.CUSTOM) {
            var region = sonifier.regionHistory[sonifier.regionHistoryIndex];
            jobSettings = __assign(__assign({}, jobSettings), { x: Math.min(data_file_1.getWidth(imageFile), Math.max(0, region.x + 1)), y: Math.min(data_file_1.getHeight(imageFile), Math.max(0, region.y + 1)), width: Math.min(data_file_1.getWidth(imageFile), Math.max(0, region.width + 1)), height: Math.min(data_file_1.getHeight(imageFile), Math.max(0, region.height + 1)) });
        }
        var job = {
            id: null,
            type: job_types_1.JobType.SourceExtraction,
            file_ids: [parseInt(fileId)],
            source_extraction_settings: jobSettings,
            merge_sources: false,
            source_merge_settings: null
        };
        var correlationId = this.correlationIdGenerator.next();
        dispatch(new jobs_actions_1.CreateJob(job, 1000, correlationId));
        return this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.correlationId == correlationId; }), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            var result = jobEntity.result;
            if (result.errors.length != 0) {
                dispatch(new workbench_actions_1.ExtractSourcesFail(result.errors.join(',')));
                return;
            }
            var sources = result.data.map(function (d) {
                var posType = source_1.PosType.PIXEL;
                var primaryCoord = d.x;
                var secondaryCoord = d.y;
                if (photometryPageSettings.coordMode == 'sky' &&
                    dataFiles[fileId].wcs && dataFiles[fileId].wcs.isValid() &&
                    "ra_hours" in d &&
                    d.ra_hours !== null &&
                    "dec_degs" in d &&
                    d.dec_degs !== null) {
                    posType = source_1.PosType.SKY;
                    primaryCoord = d.ra_hours;
                    secondaryCoord = d.dec_degs;
                }
                var pmEpoch = null;
                if (d.time && Date.parse(d.time + ' GMT')) {
                    pmEpoch = new Date(Date.parse(d.time + ' GMT')).toISOString();
                }
                return {
                    id: null,
                    label: null,
                    objectId: null,
                    fileId: d.file_id.toString(),
                    posType: posType,
                    primaryCoord: primaryCoord,
                    secondaryCoord: secondaryCoord,
                    pm: null,
                    pmPosAngle: null,
                    pmEpoch: pmEpoch
                };
            });
            dispatch(new sources_actions_1.AddSources(sources));
        }));
    };
    WorkbenchState.prototype.photometerSources = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var sourceIds = _b.sourceIds, fileIds = _b.fileIds, settings = _b.settings, isBatch = _b.isBatch;
        var state = getState();
        var sourcesState = this.store.selectSnapshot(sources_state_1.SourcesState.getState);
        sourceIds = sourceIds.filter(function (id) { return sourcesState.ids.includes(id); });
        var s;
        if (settings.mode == 'adaptive') {
            s = {
                mode: 'auto',
                a: settings.aKrFactor,
                a_in: settings.aInKrFactor,
                a_out: settings.aOutKrFactor
            };
        }
        else {
            s = {
                mode: 'aperture',
                a: settings.a,
                b: settings.b,
                a_in: settings.aIn,
                a_out: settings.aOut,
                b_out: settings.bOut,
                theta: settings.theta,
                theta_out: settings.thetaOut
            };
        }
        s.gain = settings.gain;
        s.centroid_radius = settings.centroidRadius;
        s.zero_point = settings.zeroPoint;
        var job = {
            type: job_types_1.JobType.Photometry,
            settings: s,
            id: null,
            file_ids: fileIds.map(function (id) { return parseInt(id); }),
            sources: sourceIds.map(function (id, index) {
                var source = sourcesState.entities[id];
                var x = null;
                var y = null;
                var pmPixel = null;
                var pmPosAnglePixel = null;
                var raHours = null;
                var decDegs = null;
                var pmSky = null;
                var pmPosAngleSky = null;
                if (source.posType == source_1.PosType.PIXEL) {
                    x = source.primaryCoord;
                    y = source.secondaryCoord;
                    pmPixel = source.pm;
                    pmPosAnglePixel = source.pmPosAngle;
                }
                else {
                    raHours = source.primaryCoord;
                    decDegs = source.secondaryCoord;
                    pmSky = source.pm;
                    if (pmSky)
                        pmSky /= 3600.0;
                    pmPosAngleSky = source.pmPosAngle;
                }
                return {
                    id: source.id,
                    pm_epoch: source.pmEpoch ? new Date(source.pmEpoch).toISOString() : null,
                    x: x,
                    y: y,
                    pm_pixel: pmPixel,
                    pm_pos_angle_pixel: pmPosAnglePixel,
                    ra_hours: raHours,
                    dec_degs: decDegs,
                    pm_sky: pmSky,
                    pm_pos_angle_sky: pmPosAngleSky
                };
            })
        };
        var correlationId = this.correlationIdGenerator.next();
        dispatch(new jobs_actions_1.CreateJob(job, 1000, correlationId));
        setState(function (state) {
            if (isBatch)
                state.photometryPageSettings.batchPhotProgress = 0;
            return state;
        });
        var jobCompleted$ = this.actions$.pipe(store_1.ofActionCompleted(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobCanceled$ = this.actions$.pipe(store_1.ofActionCanceled(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobErrored$ = this.actions$.pipe(store_1.ofActionErrored(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.action.correlationId == correlationId; }));
        var jobSuccessful$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.CreateJob), operators_1.filter(function (a) { return a.correlationId == correlationId; }), operators_1.takeUntil(rxjs_1.merge(jobCanceled$, jobErrored$)), operators_1.take(1), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            var result = jobEntity.result;
            if (result.errors.length != 0) {
                console.error("Errors encountered while photometering sources: ", result.errors);
            }
            if (result.warnings.length != 0) {
                console.error("Warnings encountered while photometering sources: ", result.warnings);
            }
            setState(function (state) {
                if (isBatch)
                    state.photometryPageSettings.batchPhotProgress = null;
                return state;
            });
            dispatch(new phot_data_actions_1.AddPhotDatas(result.data.map(function (d) {
                var time = null;
                if (d.time && Date.parse(d.time + ' GMT')) {
                    time = new Date(Date.parse(d.time + ' GMT'));
                }
                return {
                    id: null,
                    sourceId: d.id,
                    fileId: d.file_id.toString(),
                    time: time,
                    filter: d.filter,
                    telescope: d.telescope,
                    expLength: d.exp_length,
                    raHours: d.ra_hours,
                    decDegs: d.dec_degs,
                    x: d.x,
                    y: d.y,
                    mag: d.mag,
                    magError: d.mag_error,
                    flux: d.flux,
                    fluxError: d.flux_error
                };
            })));
        }));
        var jobUpdated$ = this.actions$.pipe(store_1.ofActionSuccessful(jobs_actions_1.UpdateJob), operators_1.filter(function (a) { return a.correlationId == correlationId; }), operators_1.takeUntil(jobCompleted$), operators_1.tap(function (a) {
            var jobEntity = _this.store.selectSnapshot(jobs_state_1.JobsState.getEntities)[a.job.id];
            setState(function (state) {
                if (isBatch) {
                    state.photometryPageSettings.batchPhotJobId = a.job.id;
                    state.photometryPageSettings.batchPhotProgress = jobEntity.job.state.progress;
                }
                return state;
            });
        }));
        return rxjs_1.merge(jobSuccessful$, jobUpdated$);
    };
    var WorkbenchState_1;
    __decorate([
        store_1.Action(auth_actions_1.ResetState),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "resetState");
    __decorate([
        store_1.Action(workbench_actions_1.ToggleFullScreen),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "toggleFullScreen");
    __decorate([
        store_1.Action(workbench_actions_1.SetFullScreen),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setFullScreen");
    __decorate([
        store_1.Action(workbench_actions_1.SetFullScreenPanel),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setFullScreenPanel");
    __decorate([
        store_1.Action(workbench_actions_1.SetSidebarView),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setSidebarView");
    __decorate([
        store_1.Action(workbench_actions_1.ShowSidebar),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "showSidebar");
    __decorate([
        store_1.Action(workbench_actions_1.HideSidebar),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "hideSidebar");
    __decorate([
        store_1.Action(workbench_actions_1.SetActiveViewer),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setActiveViewer");
    __decorate([
        store_1.Action(workbench_actions_1.CreateViewer),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "createViewer");
    __decorate([
        store_1.Action(workbench_actions_1.CloseViewer),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "closeViewer");
    __decorate([
        store_1.Action(workbench_actions_1.KeepViewerOpen),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "keepViewerOpen");
    __decorate([
        store_1.Action(workbench_actions_1.MoveToOtherView),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "moveToOtherView");
    __decorate([
        store_1.Action(workbench_actions_1.SetViewMode),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setViewMode");
    __decorate([
        store_1.Action(workbench_actions_1.SetViewerMarkers),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setViewerMarkers");
    __decorate([
        store_1.Action(workbench_actions_1.ClearViewerMarkers),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "clearViewerMarkers");
    __decorate([
        store_1.Action(workbench_actions_1.SetViewerFile),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setViewerFile");
    __decorate([
        store_1.Action(workbench_actions_1.SetViewerSyncEnabled),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setViewerSyncEnabled");
    __decorate([
        store_1.Action(workbench_actions_1.SetNormalizationSyncEnabled),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setNormalizationSyncEnabled");
    __decorate([
        store_1.Action(workbench_actions_1.SetShowConfig),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setShowConfig");
    __decorate([
        store_1.Action(workbench_actions_1.ToggleShowConfig),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "toggleShowConfig");
    __decorate([
        store_1.Action(workbench_actions_1.SetActiveTool),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setActiveTool");
    __decorate([
        store_1.Action(workbench_actions_1.UpdateCentroidSettings),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "updateCentroidSettings");
    __decorate([
        store_1.Action(workbench_actions_1.UpdatePhotometrySettings),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "updatePhotometrySettings");
    __decorate([
        store_1.Action(workbench_actions_1.UpdateSourceExtractionSettings),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "updateSourceExtractionSettings");
    __decorate([
        store_1.Action(workbench_actions_1.UpdateCustomMarkerPageSettings),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "updateCustomMarkerPageSettings");
    __decorate([
        store_1.Action(workbench_actions_1.UpdatePlotterPageSettings),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "updatePlotterPageSettings");
    __decorate([
        store_1.Action(workbench_actions_1.UpdatePhotometryPageSettings),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "updatePhotometryPageSettings");
    __decorate([
        store_1.Action(workbench_actions_1.UpdatePixelOpsPageSettings),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "updatePixelOpsPageSettings");
    __decorate([
        store_1.Action(workbench_actions_1.UpdateStackingPageSettings),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "updateStackingPageSettings");
    __decorate([
        store_1.Action(workbench_actions_1.UpdateAligningPageSettings),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "updateAligningPageSettings");
    __decorate([
        store_1.Action(workbench_actions_1.SetSelectedCatalog),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setSelectedCatalog");
    __decorate([
        store_1.Action(workbench_actions_1.SetSelectedFieldCal),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "setSelectedFieldCal");
    __decorate([
        store_1.Action(workbench_actions_1.CloseSidenav),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "closeSideNav");
    __decorate([
        store_1.Action(workbench_actions_1.OpenSidenav),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "openSideNav");
    __decorate([
        store_1.Action(data_files_actions_1.LoadLibrarySuccess),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "loadLibrarySuccess");
    __decorate([
        store_1.Action(data_files_actions_1.RemoveDataFile),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "removeDataFile");
    __decorate([
        store_1.Action(data_files_actions_1.RemoveDataFileSuccess),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "removeDataFileSuccess");
    __decorate([
        store_1.Action(workbench_actions_1.SelectDataFile),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "selectDataFile");
    __decorate([
        store_1.Action([workbench_file_states_actions_1.MoveBy, workbench_file_states_actions_1.ZoomBy, workbench_file_states_actions_1.RotateBy, workbench_file_states_actions_1.Flip, workbench_file_states_actions_1.ResetImageTransform, workbench_file_states_actions_1.SetViewportTransform, workbench_file_states_actions_1.SetImageTransform]),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "onTransformChange");
    __decorate([
        store_1.Action(workbench_file_states_actions_1.UpdateNormalizer),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "onNormalizationChange");
    __decorate([
        store_1.Action([workbench_file_states_actions_1.StartLine, workbench_file_states_actions_1.UpdateLine, workbench_file_states_actions_1.UpdatePlotterFileState]),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "onPlotterChange");
    __decorate([
        store_1.Action(workbench_actions_1.SyncFileNormalizations),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "syncFileNormalizations");
    __decorate([
        store_1.Action(workbench_actions_1.SyncFilePlotters),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "syncFilePlotters");
    __decorate([
        store_1.Action(workbench_actions_1.SyncFileTransformations),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "syncFileTransformations");
    __decorate([
        store_1.Action(workbench_actions_1.LoadCatalogs),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "loadCatalogs");
    __decorate([
        store_1.Action(workbench_actions_1.LoadFieldCals),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "loadFieldCals");
    __decorate([
        store_1.Action(workbench_actions_1.CreateFieldCal),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "createFieldCal");
    __decorate([
        store_1.Action(workbench_actions_1.UpdateFieldCal),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "updateFieldCal");
    __decorate([
        store_1.Action(workbench_actions_1.AddFieldCalSourcesFromCatalog),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "addFieldCalSourcesFromCatalog");
    __decorate([
        store_1.Action(workbench_actions_1.CreatePixelOpsJob),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "createPixelOpsJob");
    __decorate([
        store_1.Action(workbench_actions_1.CreateAdvPixelOpsJob),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "createAdvPixelOpsJob");
    __decorate([
        store_1.Action(workbench_actions_1.CreateAlignmentJob),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "createAlignmentJob");
    __decorate([
        store_1.Action(workbench_actions_1.CreateStackingJob),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "createStackingJob");
    __decorate([
        store_1.Action(workbench_actions_1.ImportFromSurvey),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "importFromSurvey");
    __decorate([
        store_1.Action(workbench_actions_1.ExtractSources),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "extractSources");
    __decorate([
        store_1.Action(workbench_actions_1.PhotometerSources),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchState.prototype, "photometerSources");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getState");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getFullScreenPanel");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getInFullScreenMode");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getViewerIds");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getViewerEntities");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getViewers");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getPrimaryViewerIds");
    __decorate([
        store_1.Selector([WorkbenchState_1.getPrimaryViewerIds, WorkbenchState_1.getViewerEntities])
    ], WorkbenchState, "getPrimaryViewers");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getSecondaryViewerIds");
    __decorate([
        store_1.Selector([WorkbenchState_1.getSecondaryViewerIds, WorkbenchState_1.getViewerEntities])
    ], WorkbenchState, "getSecondaryViewers");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getViewerById");
    __decorate([
        store_1.Selector([WorkbenchState_1.getViewers])
    ], WorkbenchState, "getViewerFileIds");
    __decorate([
        store_1.Selector([WorkbenchState_1.getViewerFileIds, data_files_state_1.DataFilesState.getEntities])
    ], WorkbenchState, "getViewerFileHeaders");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getActiveFileId");
    __decorate([
        store_1.Selector([WorkbenchState_1.getActiveFileId, data_files_state_1.DataFilesState])
    ], WorkbenchState, "getActiveFile");
    __decorate([
        store_1.Selector([WorkbenchState_1.getActiveFile])
    ], WorkbenchState, "getActiveFileHeader");
    __decorate([
        store_1.Selector([WorkbenchState_1.getActiveFile])
    ], WorkbenchState, "getActiveImageFile");
    __decorate([
        store_1.Selector([WorkbenchState_1.getActiveImageFile, workbench_file_states_state_1.WorkbenchFileStates])
    ], WorkbenchState, "getActiveImageFileState");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getActiveViewerId");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getActiveViewer");
    __decorate([
        store_1.Selector([data_files_state_1.DataFilesState])
    ], WorkbenchState, "getSelectedFile");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getShowConfig");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getShowSourceLabels");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getViewerSyncEnabled");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getNormalizationSyncEnabled");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getDssImportLoading");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getViewMode");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getActiveTool");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getShowSidebar");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getSidebarView");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getPhotometrySettings");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getSourceExtractionSettings");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getCentroidSettings");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getCustomMarkerPageSettings");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getPlotterPageSettings");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getPhotometryPageSettings");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getPhotometrySelectedSourceIds");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getPhotometryCoordMode");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getPhotometryShowSourcesFromAllFiles");
    __decorate([
        store_1.Selector()
    ], WorkbenchState, "getPhotometryShowSourceLabels");
    __decorate([
        store_1.Selector([workbench_file_states_state_1.WorkbenchFileStates, data_files_state_1.DataFilesState])
    ], WorkbenchState, "getPlotterMarkers");
    __decorate([
        store_1.Selector([workbench_file_states_state_1.WorkbenchFileStates, data_files_state_1.DataFilesState])
    ], WorkbenchState, "getSonifierMarkers");
    __decorate([
        store_1.Selector([workbench_file_states_state_1.WorkbenchFileStates, data_files_state_1.DataFilesState, sources_state_1.SourcesState])
    ], WorkbenchState, "getPhotometrySourceMarkers");
    WorkbenchState = WorkbenchState_1 = __decorate([
        store_1.State({
            name: 'workbench',
            defaults: workbenchStateDefaults
        })
    ], WorkbenchState);
    return WorkbenchState;
}());
exports.WorkbenchState = WorkbenchState;
