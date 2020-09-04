"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.PhotometryPageComponent = exports.SourcesDataSource = void 0;
var core_1 = require("@angular/core");
var moment = require("moment");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var jStat = require("jstat");
var FileSaver_1 = require("file-saver/dist/FileSaver");
var data_file_1 = require("../../../../data-files/models/data-file");
var phot_settings_dialog_component_1 = require("../../../components/phot-settings-dialog/phot-settings-dialog.component");
var source_extraction_dialog_component_1 = require("../../../components/source-extraction-dialog/source-extraction-dialog.component");
var source_1 = require("../../../models/source");
var workbench_state_1 = require("../../../models/workbench-state");
var collections_1 = require("@angular/cdk/collections");
var centroider_1 = require("../../../models/centroider");
var sources_state_1 = require("../../../sources.state");
var workbench_state_2 = require("../../../workbench.state");
var workbench_actions_1 = require("../../../workbench.actions");
var sources_actions_1 = require("../../../sources.actions");
var data_files_state_1 = require("../../../../data-files/data-files.state");
var phot_data_actions_1 = require("../../../phot-data.actions");
var phot_data_state_1 = require("../../../phot-data.state.");
var forms_1 = require("@angular/forms");
var workbench_page_base_component_1 = require("../workbench-page-base/workbench-page-base.component");
var marker_1 = require("../../../models/marker");
var jobs_state_1 = require("../../../../jobs/jobs.state");
var skynet_astro_1 = require("../../../../../app/utils/skynet-astro");
var SourcesDataSource = /** @class */ (function () {
    function SourcesDataSource(store) {
        this.store = store;
        this.rows = [];
        this.sources = [];
        this.count = 0;
        var activeImageFileId$ = store.select(workbench_state_2.WorkbenchState.getActiveImageFile).pipe(operators_1.filter(function (f) { return f != null && f.headerLoaded; }), operators_1.map(function (f) { return f.id; }), operators_1.distinctUntilChanged());
        var showSourcesFromAllFiles$ = store.select(workbench_state_2.WorkbenchState.getPhotometryPageSettings).pipe(operators_1.map(function (s) { return s.showSourcesFromAllFiles; }), operators_1.distinctUntilChanged());
        var coordMode$ = store.select(workbench_state_2.WorkbenchState.getPhotometryPageSettings).pipe(operators_1.map(function (s) { return s.coordMode; }), operators_1.distinctUntilChanged());
        this.visibleSources$ = rxjs_1.combineLatest(activeImageFileId$, showSourcesFromAllFiles$, coordMode$, this.store.select(sources_state_1.SourcesState.getSources)).pipe(operators_1.withLatestFrom(store.select(data_files_state_1.DataFilesState.getEntities)), operators_1.map(function (_a) {
            var _b = _a[0], fileId = _b[0], showSourcesFromAllFiles = _b[1], coordMode = _b[2], sources = _b[3], dataFiles = _a[1];
            if (!dataFiles[fileId].wcs.isValid())
                coordMode = 'pixel';
            return sources.filter(function (source) {
                if (coordMode != source.posType)
                    return false;
                if (source.fileId == fileId)
                    return true;
                if (!showSourcesFromAllFiles)
                    return false;
                var coord = data_file_1.getSourceCoordinates(dataFiles[fileId], source);
                if (coord == null)
                    return false;
                return true;
            });
        }));
        this.rows$ = rxjs_1.combineLatest(this.visibleSources$, this.store.select(phot_data_state_1.PhotDataState.getSourcesPhotData), activeImageFileId$).pipe(operators_1.map(function (_a) {
            var sources = _a[0], photDatas = _a[1], fileId = _a[2];
            return sources.map(function (source) {
                return {
                    source: source,
                    photData: photDatas.find(function (d) { return d.sourceId == source.id && d.fileId == fileId; })
                };
            });
        }));
    }
    SourcesDataSource.prototype.connect = function (collectionViewer) {
        var _this = this;
        this.sub = this.rows$.subscribe(function (rows) {
            _this.rows = rows;
            _this.sources = rows.map(function (row) { return row.source; });
        });
        return this.rows$;
    };
    SourcesDataSource.prototype.disconnect = function (collectionViewer) {
        this.sub.unsubscribe();
    };
    return SourcesDataSource;
}());
exports.SourcesDataSource = SourcesDataSource;
var PhotometryPageComponent = /** @class */ (function (_super) {
    __extends(PhotometryPageComponent, _super);
    function PhotometryPageComponent(dialog, dmsPipe, datePipe, papa, actions$, store, router) {
        var _this = _super.call(this, store, router) || this;
        _this.dialog = dialog;
        _this.dmsPipe = dmsPipe;
        _this.datePipe = datePipe;
        _this.papa = papa;
        _this.actions$ = actions$;
        _this.classList = "fx-workbench-outlet";
        _this.NUMBER_FORMAT = function (v) { return (v ? v : "N/A"); };
        _this.DECIMAL_FORMAT = function (v) { return (v ? v.toFixed(2) : "N/A"); };
        _this.SEXAGESIMAL_FORMAT = function (v) {
            return v ? _this.dmsPipe.transform(v) : "N/A";
        };
        _this.SourcePosType = source_1.PosType;
        _this.selectionModel = new collections_1.SelectionModel(true, []);
        _this.batchPhotForm = new forms_1.FormGroup({
            selectedImageFileIds: new forms_1.FormControl([], forms_1.Validators.required)
        });
        _this.photometryPageSettings$ = store.select(workbench_state_2.WorkbenchState.getPhotometryPageSettings);
        _this.batchPhotJobEntity$ = _this.photometryPageSettings$.pipe(operators_1.map(function (s) { return s.batchPhotJobId; }), operators_1.withLatestFrom(_this.store.select(jobs_state_1.JobsState.getEntities)), operators_1.map(function (_a) {
            var jobId = _a[0], jobEntities = _a[1];
            return jobEntities[jobId];
        }), operators_1.filter(function (job) { return job != null && job != undefined; }), operators_1.tap(function (job) { return console.log('batch phot job', job); }));
        _this.batchPhotJob$ = _this.batchPhotJobEntity$.pipe(operators_1.map(function (entity) { return entity.job; }));
        _this.batchPhotJobResult$ = _this.batchPhotJobEntity$.pipe(operators_1.map(function (entity) { return entity.result; }));
        //TODO:  Move page settings to different states and add selectors
        //photometry page settings changes when progress is updated
        _this.markerUpdater = rxjs_1.combineLatest(_this.viewerFileIds$, _this.viewerImageFileHeaders$, _this.store.select(sources_state_1.SourcesState.getSources), _this.store.select(workbench_state_2.WorkbenchState.getPhotometryPageSettings)).pipe(operators_1.withLatestFrom(_this.store.select(workbench_state_2.WorkbenchState.getViewers), _this.store.select(data_files_state_1.DataFilesState.getEntities), _this.store.select(workbench_state_2.WorkbenchState.getActiveTool))).subscribe(function (_a) {
            var _b = _a[0], viewerFileIds = _b[0], viewerImageFileHeaders = _b[1], sources = _b[2], photPageSettings = _b[3], viewers = _a[1], dataFiles = _a[2], activeTool = _a[3];
            if (activeTool != workbench_state_1.WorkbenchTool.PHOTOMETRY)
                return;
            var selectedSourceIds = photPageSettings.selectedSourceIds;
            var coordMode = photPageSettings.coordMode;
            var showSourcesFromAllFiles = photPageSettings.showSourcesFromAllFiles;
            var showSourceLabels = photPageSettings.showSourceLabels;
            viewers.forEach(function (viewer) {
                var fileId = viewer.fileId;
                if (fileId == null || !dataFiles[fileId]) {
                    _this.store.dispatch(new workbench_actions_1.SetViewerMarkers(viewer.viewerId, []));
                    return;
                }
                var file = dataFiles[fileId];
                if (!file.headerLoaded) {
                    _this.store.dispatch(new workbench_actions_1.SetViewerMarkers(viewer.viewerId, []));
                    return;
                }
                var markers = [];
                var mode = coordMode;
                if (!file.wcs.isValid())
                    mode = 'pixel';
                sources.forEach(function (source) {
                    if (source.fileId != fileId && !showSourcesFromAllFiles)
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
                            label: showSourceLabels ? source.label : "",
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
                            label: showSourceLabels ? source.label : "",
                            selected: selected,
                            data: { id: source.id }
                        });
                    }
                });
                _this.store.dispatch(new workbench_actions_1.SetViewerMarkers(viewer.viewerId, markers));
            });
        });
        _this.photometryFileState$ = _this.activeImageFileState$.pipe(operators_1.map(function (state) { return state.photometry; }));
        _this.dataSource = new SourcesDataSource(store);
        _this.batchPhotFormData$ = store.select(workbench_state_2.WorkbenchState.getState).pipe(operators_1.map(function (state) { return state.photometryPageSettings.batchPhotFormData; }), operators_1.tap(function (data) {
            // console.log("patching values: ", data.selectedImageFileIds)
            _this.batchPhotForm.patchValue(data, { emitEvent: false });
        }));
        _this.batchPhotFormData$.subscribe();
        _this.batchPhotForm.valueChanges.subscribe(function (value) {
            // if(this.imageCalcForm.valid) {
            _this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({ batchPhotFormData: _this.batchPhotForm.value }));
            // }
        });
        _this.selectedImageFiles$ = rxjs_1.combineLatest(_this.allImageFiles$, _this.batchPhotFormData$).pipe(operators_1.map(function (_a) {
            var allImageFiles = _a[0], data = _a[1];
            return data.selectedImageFileIds.map(function (id) { return allImageFiles.find(function (f) { return f.id == id; }); });
        }));
        _this.centroidSettings$ = store.select(workbench_state_2.WorkbenchState.getCentroidSettings);
        _this.photometrySettings$ = _this.store.select(workbench_state_2.WorkbenchState.getPhotometrySettings);
        _this.selectedSourceIds$ = rxjs_1.combineLatest(_this.photometryPageSettings$, _this.dataSource.visibleSources$).pipe(operators_1.map(function (_a) {
            var settings = _a[0], sources = _a[1];
            return sources.filter(function (s) { return settings.selectedSourceIds.includes(s.id); }).map(function (s) { return s.id; });
        }), operators_1.tap(function (selectedSourceIds) {
            var _a;
            _this.selectionModel.clear();
            (_a = _this.selectionModel).select.apply(_a, selectedSourceIds);
        }));
        _this.selectedSourceIds$.subscribe();
        _this.showAllSources$ = _this.photometryPageSettings$.pipe(operators_1.map(function (settings) { return settings.showSourcesFromAllFiles; }));
        _this.showSourceLabels$ = _this.photometryPageSettings$.pipe(operators_1.map(function (settings) { return settings.showSourceLabels; }));
        _this.photUpdater = _this.dataSource.rows$.pipe(operators_1.map(function (rows) { return rows.filter(function (row) { return row.photData == null; }); }), operators_1.filter(function (rows) { return rows.length != 0 && _this.store.selectSnapshot(workbench_state_2.WorkbenchState.getPhotometryPageSettings).autoPhot; }), operators_1.withLatestFrom(_this.photometrySettings$, _this.activeImageFile$), operators_1.switchMap(function (_a) {
            var rows = _a[0], photometrySettings = _a[1], imageFile = _a[2];
            return _this.store.dispatch(new workbench_actions_1.PhotometerSources(rows.map(function (row) { return row.source.id; }), [imageFile.id], photometrySettings, false));
        })).subscribe();
        return _this;
    }
    PhotometryPageComponent.prototype.ngOnInit = function () {
    };
    PhotometryPageComponent.prototype.ngAfterViewInit = function () { };
    PhotometryPageComponent.prototype.ngOnDestroy = function () {
        this.store.dispatch(new workbench_actions_1.ClearViewerMarkers());
        this.photUpdater.unsubscribe();
        this.markerUpdater.unsubscribe();
    };
    PhotometryPageComponent.prototype.ngOnChanges = function () { };
    // setRegionOption(value) {
    //   this.store.dispatch(
    //     new UpdateSourceExtractorFileState(this.activeImageFile.id, { regionOption: value })
    //   );
    // }
    PhotometryPageComponent.prototype.openSourceExtractionSettings = function (fileId) {
        var _this = this;
        var sourceExtractionSettings = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getSourceExtractionSettings);
        var dialogRef = this.dialog.open(source_extraction_dialog_component_1.SourceExtractionDialogComponent, {
            width: "500px",
            data: __assign({}, sourceExtractionSettings)
        });
        dialogRef.afterClosed().subscribe(function (result) {
            if (result) {
                _this.store.dispatch([
                    new workbench_actions_1.UpdateSourceExtractionSettings(result),
                    new workbench_actions_1.ExtractSources(fileId, result)
                ]);
            }
        });
    };
    PhotometryPageComponent.prototype.openPhotSettings = function () {
        var _this = this;
        var photometrySettings = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getPhotometrySettings);
        var dialogRef = this.dialog.open(phot_settings_dialog_component_1.PhotSettingsDialogComponent, {
            width: '600px',
            data: __assign({}, photometrySettings)
        });
        dialogRef.afterClosed().subscribe(function (result) {
            if (result) {
                _this.store.dispatch(new workbench_actions_1.UpdatePhotometrySettings(result));
                _this.store.dispatch(new phot_data_actions_1.RemoveAllPhotDatas());
            }
        });
    };
    // onSelectedRowChanges($event: ITdDataTableSelectEvent) {
    //   if ($event.selected) {
    //     this.selectSources([$event.row]);
    //   } else {
    //     this.deselectSources([$event.row]);
    //   }
    // }
    PhotometryPageComponent.prototype.onShowAllSourcesChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({ showSourcesFromAllFiles: $event.checked }));
    };
    PhotometryPageComponent.prototype.onShowSourceLabelsChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({ showSourceLabels: $event.checked }));
    };
    PhotometryPageComponent.prototype.onCoordModeChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({ coordMode: $event.value }));
    };
    // onSelectAllRows($event: ITdDataTableSelectAllEvent) {
    //   if ($event.selected) {
    //     this.selectSources($event.rows);
    //   } else {
    //     this.deselectSources($event.rows);
    //   }
    // }
    PhotometryPageComponent.prototype.selectSources = function (sources) {
        var selectedSourceIds = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getPhotometryPageSettings).selectedSourceIds;
        this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({
            selectedSourceIds: __spreadArrays(selectedSourceIds, sources.filter(function (s) { return !selectedSourceIds.includes(s.id); }).map(function (s) { return s.id; }))
        }));
    };
    PhotometryPageComponent.prototype.deselectSources = function (sources) {
        var idsToRemove = sources.map(function (s) { return s.id; });
        var selectedSourceIds = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getPhotometryPageSettings)
            .selectedSourceIds.filter(function (id) { return !idsToRemove.includes(id); });
        this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({
            selectedSourceIds: selectedSourceIds
        }));
    };
    PhotometryPageComponent.prototype.toggleSource = function (source) {
        if (this.selectionModel.isSelected(source.id)) {
            this.deselectSources([source]);
        }
        else {
            this.selectSources([source]);
        }
    };
    // findSources() {
    //   this.store.dispatch(
    //     new ExtractSources(this.activeImageFile.id, this.workbenchState.sourceExtractionSettings)
    //   );
    // }
    PhotometryPageComponent.prototype.onMarkerClick = function ($event) {
        if ($event.mouseEvent.altKey)
            return;
        var source = this.dataSource.sources.find(function (source) { return $event.marker.data && source.id == $event.marker.data["id"]; });
        if (!source)
            return;
        var sourceSelected = this.selectionModel.selected.includes(source.id);
        // if(!sourceSelected) {
        //   // select the source
        //   this.selectSources($event.targetFile, [source]);
        // }
        // else {
        //   // deselect the source
        //   this.deselectSources($event.targetFile, [source]);
        // }
        if ($event.mouseEvent.ctrlKey) {
            if (!sourceSelected) {
                // select the source
                this.selectSources([source]);
            }
            else {
                // deselect the source
                this.deselectSources([source]);
            }
        }
        else {
            this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({
                selectedSourceIds: [source.id]
            }));
        }
        $event.mouseEvent.stopImmediatePropagation();
        $event.mouseEvent.preventDefault();
    };
    PhotometryPageComponent.prototype.onImageClick = function ($event) {
        var photometryPageSettings = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getPhotometryPageSettings);
        var centroidClicks = photometryPageSettings.centroidClicks;
        var activeImageFile = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getActiveImageFile);
        var centroidSettings = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getCentroidSettings);
        if ($event.hitImage) {
            if (this.selectionModel.selected.length == 0 || $event.mouseEvent.altKey) {
                var primaryCoord = $event.imageX;
                var secondaryCoord = $event.imageY;
                var posType = source_1.PosType.PIXEL;
                if (centroidClicks) {
                    var result = centroider_1.centroidPsf(activeImageFile, primaryCoord, secondaryCoord, centroidSettings.psfCentroiderSettings);
                    primaryCoord = result.x;
                    secondaryCoord = result.y;
                }
                if (photometryPageSettings.coordMode == 'sky' && activeImageFile.wcs.isValid()) {
                    var wcs = activeImageFile.wcs;
                    var raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
                    primaryCoord = raDec[0];
                    secondaryCoord = raDec[1];
                    posType = source_1.PosType.SKY;
                }
                var centerEpoch = data_file_1.getCenterTime(activeImageFile);
                var source = {
                    id: null,
                    label: null,
                    objectId: null,
                    fileId: activeImageFile.id,
                    primaryCoord: primaryCoord,
                    secondaryCoord: secondaryCoord,
                    posType: posType,
                    pm: null,
                    pmPosAngle: null,
                    pmEpoch: centerEpoch ? centerEpoch.toISOString() : null
                };
                this.store.dispatch(new sources_actions_1.AddSources([source]));
            }
            else {
                this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({
                    selectedSourceIds: []
                }));
            }
        }
    };
    PhotometryPageComponent.prototype.removeSelectedSources = function () {
        var selectedSourceIds = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getPhotometryPageSettings).selectedSourceIds;
        this.store.dispatch(new sources_actions_1.RemoveSources(selectedSourceIds));
    };
    PhotometryPageComponent.prototype.removeAllSources = function () {
        this.store.dispatch(new sources_actions_1.RemoveSources(this.dataSource.sources.map(function (s) { return s.id; })));
    };
    PhotometryPageComponent.prototype.mergeSelectedSources = function () {
        var selectedSourceIds = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getPhotometryPageSettings).selectedSourceIds;
        var selectedSources = this.dataSource.sources.filter(function (s) { return selectedSourceIds.includes(s.id); });
        this.mergeError = null;
        if (!selectedSources.every(function (source) { return source.posType == selectedSources[0].posType; })) {
            this.mergeError =
                "You cannot merge sources with different position types";
            return;
        }
        if (selectedSources.some(function (source) { return source.pmEpoch == null; })) {
            this.mergeError =
                "You can only merge sources which have epochs defined";
            return;
        }
        //verify unique epochs
        var sortedEpochs = selectedSources
            .map(function (source) { return new Date(source.pmEpoch); })
            .sort();
        for (var i = 0; i < sortedEpochs.length - 1; i++) {
            if (sortedEpochs[i + 1] == sortedEpochs[i]) {
                this.mergeError =
                    "All source epochs must be unique when merging";
                return;
            }
        }
        var t0 = new Date(selectedSources[0].pmEpoch).getTime();
        var primaryCoord0 = selectedSources[0].primaryCoord;
        var secondaryCoord0 = selectedSources[0].secondaryCoord;
        var data = selectedSources.map(function (source) {
            var centerSecondaryCoord = (source.secondaryCoord + secondaryCoord0) / 2.0;
            console.log(source.pmEpoch, new Date(source.pmEpoch));
            return [
                ((new Date(source.pmEpoch)).getTime() - t0) / 1000.0,
                (source.primaryCoord - primaryCoord0) *
                    (source.posType == source_1.PosType.PIXEL
                        ? 1
                        : 15 * 3600 * Math.cos((centerSecondaryCoord * Math.PI) / 180.0)),
                (source.secondaryCoord - secondaryCoord0) *
                    (source.posType == source_1.PosType.PIXEL ? 1 : 3600)
            ];
        });
        var x = data.map(function (d) { return [1, d[0]]; });
        var primaryY = data.map(function (d) { return d[1]; });
        var secondaryY = data.map(function (d) { return d[2]; });
        var primaryModel = jStat.models.ols(primaryY, x);
        var secondaryModel = jStat.models.ols(secondaryY, x);
        var primaryRate = primaryModel.coef[1];
        var secondaryRate = secondaryModel.coef[1];
        var positionAngle = (Math.atan2(primaryRate, secondaryRate) * 180.0) / Math.PI;
        positionAngle = positionAngle % 360;
        if (positionAngle < 0)
            positionAngle += 360;
        var rate = Math.sqrt(Math.pow(primaryRate, 2) + Math.pow(secondaryRate, 2));
        this.store.dispatch([
            new sources_actions_1.UpdateSource(selectedSources[0].id, { pm: rate, pmPosAngle: positionAngle }),
            new sources_actions_1.RemoveSources(selectedSources.slice(1).map(function (s) { return s.id; })),
            new phot_data_actions_1.RemovePhotDatas(this.store.selectSnapshot(phot_data_state_1.PhotDataState.getSourcesPhotData).filter(function (d) { return selectedSourceIds.includes(d.sourceId); }).map(function (d) { return d.id; }))
        ]);
        // let primaryResult = regression.linear(primaryCoordData, { precision: 6 });
        // let secondaryResult = regression.linear(secondaryCoordData, { precision: 6 });
        // console.log(primaryResult, secondaryResult);
        // let file = this.referenceFiles[this.source.fileId] as ImageFile;
        //   let centerTime = getCenterTime(file);
        //   let referenceFile = this.referenceFiles[this.referenceSource.fileId] as ImageFile;
        //   let referenceCenterTime = getCenterTime(referenceFile);
        //   let deltaSecs = (referenceCenterTime.getTime() - centerTime.getTime())/1000.0;
        //   if (this.pixelCoordView == 'sky') {
        //     let centerDecDegs = (this.referenceSource.decDegs + this.source.decDegs) / 2;
        //     let deltaRaArcsecs = (this.referenceSource.raHours - this.source.raHours) * 15 * 3600 * Math.cos(centerDecDegs * Math.PI / 180.0);
        //     let deltaDecArcsecs = (this.referenceSource.decDegs - this.source.decDegs) * 3600;
        //     let positionAngleDegs = Math.atan2(deltaDecArcsecs, -deltaRaArcsecs) * 180.0 / Math.PI - 90;
        //     positionAngleDegs = positionAngleDegs % 360;
        //     if (positionAngleDegs < 0) positionAngleDegs += 360;
        //     let wcs = getWcs(file);
        //     let pixelPmPosAngle = positionAngleDegs+wcs.positionAngle()
        //     pixelPmPosAngle = pixelPmPosAngle % 360;
        //     if (pixelPmPosAngle < 0) pixelPmPosAngle += 360;
        //     console.log(wcs.positionAngle(), positionAngleDegs, pixelPmPosAngle);
        //     this.source = {
        //       ...this.source,
        //       skyPm: Math.sqrt(Math.pow(deltaRaArcsecs, 2) + Math.pow(deltaDecArcsecs, 2))/deltaSecs,
        //       skyPmPosAngle: positionAngleDegs,
        //       pixelPm: null,
        //       pixelPmPosAngle: pixelPmPosAngle
        //     }
        //   }
        //   else {
        //     let deltaX = (this.referenceSource.x - this.source.x);
        //     let deltaY = (this.referenceSource.y - this.source.y);
        //     let positionAngleDegs = Math.atan2(deltaY, -deltaX) * 180.0 / Math.PI - 90;
        //     console.log(deltaX, deltaY, positionAngleDegs);
        //     positionAngleDegs = positionAngleDegs % 360;
        //     if (positionAngleDegs < 0) positionAngleDegs += 360;
        //     console.log(positionAngleDegs);
        //     this.source = {
        //       ...this.source,
        //       pixelPm: Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2))/deltaSecs,
        //       pixelPmPosAngle: positionAngleDegs,
        //       skyPm: null,
        //       skyPmPosAngle: null
        //     }
        //   }
    };
    PhotometryPageComponent.prototype.photometerAllSources = function (imageFile) {
        var s = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getPhotometrySettings);
        this.store.dispatch(new workbench_actions_1.PhotometerSources(this.dataSource.sources.map(function (s) { return s.id; }), [imageFile.id], s, false));
    };
    PhotometryPageComponent.prototype.showSelectAll = function () {
        return this.dataSource.sources && this.dataSource.sources.length != 0;
    };
    PhotometryPageComponent.prototype.isAllSelected = function () {
        var numSelected = this.selectionModel.selected.length;
        var numRows = this.dataSource.sources.length;
        return numSelected === numRows;
    };
    PhotometryPageComponent.prototype.exportSourceData = function () {
        var _this = this;
        var data = this.papa.unparse(this.dataSource.rows
            .map(function (d) {
            var time = d.photData.time
                ? moment.utc(d.photData.time, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
                : null;
            var pmEpoch = d.source.pmEpoch
                ? moment.utc(d.source.pmEpoch, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
                : null;
            // console.log(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), datetimeToJd(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()))
            var jd = time
                ? skynet_astro_1.datetimeToJd(time)
                : null;
            return __assign(__assign(__assign({}, d.source), d.photData), { time: time
                    ? _this.datePipe.transform(time, "yyyy-MM-dd HH:mm:ss.SSS")
                    : null, pm_epoch: pmEpoch
                    ? _this.datePipe.transform(pmEpoch, "yyyy-MM-dd HH:mm:ss.SSS")
                    : null, jd: jd, mjd: jd ? skynet_astro_1.jdToMjd(jd) : null });
        })
        // .sort((a, b) => (a.jd > b.jd ? 1 : -1))
        );
        var blob = new Blob([data], { type: "text/plain;charset=utf-8" });
        FileSaver_1.saveAs(blob, "afterglow_sources.csv");
    };
    /** Selects all rows if they are not all selected; otherwise clear selection. */
    PhotometryPageComponent.prototype.masterToggle = function () {
        if (this.isAllSelected()) {
            this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({
                selectedSourceIds: []
            }));
        }
        else {
            this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({
                selectedSourceIds: this.dataSource.sources.map(function (s) { return s.id; })
            }));
        }
    };
    PhotometryPageComponent.prototype.trackByFn = function (index, value) {
        return value.id;
    };
    PhotometryPageComponent.prototype.onCentroidClicksChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({
            centroidClicks: $event.checked
        }));
    };
    PhotometryPageComponent.prototype.onAutoPhotChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({
            autoPhot: $event.checked
        }));
    };
    PhotometryPageComponent.prototype.clearPhotDataFromAllFiles = function () {
        this.store.dispatch(new phot_data_actions_1.RemoveAllPhotDatas());
    };
    PhotometryPageComponent.prototype.selectImageFiles = function (imageFiles) {
        this.store.dispatch(new workbench_actions_1.UpdatePhotometryPageSettings({
            batchPhotFormData: __assign(__assign({}, this.batchPhotForm.value), { selectedImageFileIds: imageFiles.map(function (f) { return f.id; }) })
        }));
    };
    PhotometryPageComponent.prototype.batchPhotometer = function () {
        var s = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getPhotometrySettings);
        this.store.dispatch(new workbench_actions_1.PhotometerSources(this.dataSource.sources.map(function (s) { return s.id; }), this.store.selectSnapshot(workbench_state_2.WorkbenchState.getPhotometryPageSettings).batchPhotFormData.selectedImageFileIds, s, true));
    };
    PhotometryPageComponent.prototype.downloadBatchPhotData = function (row) {
        var _this = this;
        var result = row.result;
        var data = this.papa.unparse(result.data
            .map(function (d) {
            var time = d.time
                ? moment.utc(d.time, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
                : null;
            var pmEpoch = d.pm_epoch
                ? moment.utc(d.pm_epoch, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
                : null;
            // console.log(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), datetimeToJd(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()))
            var jd = time
                ? skynet_astro_1.datetimeToJd(time)
                : null;
            return __assign(__assign({}, d), { time: time
                    ? _this.datePipe.transform(time, "yyyy-MM-dd HH:mm:ss.SSS")
                    : null, pm_epoch: pmEpoch
                    ? _this.datePipe.transform(pmEpoch, "yyyy-MM-dd HH:mm:ss.SSS")
                    : null, jd: jd, mjd: jd ? skynet_astro_1.jdToMjd(jd) : null });
        }), {
            columns: ['file_id', 'id', 'time', 'jd', 'mjd', 'ra_hours', 'dec_degs', 'x', 'y', 'telescope', 'filter', 'exp_length', 'mag', 'mag_error', 'flux', 'flux_error', 'pm_sky', 'pm_epoch', 'pm_pos_angle_sky']
        }
        // .sort((a, b) => (a.jd > b.jd ? 1 : -1))
        );
        var blob = new Blob([data], { type: "text/plain;charset=utf-8" });
        FileSaver_1.saveAs(blob, "afterglow_photometry_" + row.job.id + ".csv");
        // let sources = this.store.selectSnapshot(SourcesState.getEntities);
        // let data = this.store.selectSnapshot(PhotDataState.getSourcesPhotData).map(d => {
        //   return {
        //     ...sources[d.sourceId],
        //     ...d
        //   }
        // });
        // let blob = new Blob([this.papa.unparse(data)], { type: "text/plain;charset=utf-8" });
        // saveAs(blob, `afterglow_photometry.csv`);
    };
    __decorate([
        core_1.HostBinding("class"),
        core_1.Input("class")
    ], PhotometryPageComponent.prototype, "classList");
    PhotometryPageComponent = __decorate([
        core_1.Component({
            selector: "app-photometry-page",
            templateUrl: "./photometry-page.component.html",
            styleUrls: ["./photometry-page.component.css"]
        })
    ], PhotometryPageComponent);
    return PhotometryPageComponent;
}(workbench_page_base_component_1.WorkbenchPageBaseComponent));
exports.PhotometryPageComponent = PhotometryPageComponent;
