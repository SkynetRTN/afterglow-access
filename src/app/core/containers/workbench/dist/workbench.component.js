"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.WorkbenchComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var data_file_1 = require("../../../data-files/models/data-file");
var sidebar_view_1 = require("../../models/sidebar-view");
var angular2_hotkeys_1 = require("../../../../../node_modules/angular2-hotkeys");
var data_files_state_1 = require("../../../data-files/data-files.state");
var workbench_state_1 = require("../../workbench.state");
var workbench_actions_1 = require("../../workbench.actions");
var data_files_actions_1 = require("../../../data-files/data-files.actions");
var data_providers_actions_1 = require("../../../data-providers/data-providers.actions");
var view_mode_1 = require("../../models/view-mode");
var data_providers_state_1 = require("../../../data-providers/data-providers.state");
var confirmation_dialog_component_1 = require("../../components/confirmation-dialog/confirmation-dialog.component");
var router_plugin_1 = require("@ngxs/router-plugin");
var data_file_type_1 = require("../../../data-files/models/data-file-type");
var workbench_state_2 = require("../../models/workbench-state");
var workbench_file_states_state_1 = require("../../workbench-file-states.state");
var marker_1 = require("../../models/marker");
var centroider_1 = require("../../models/centroider");
var workbench_file_states_actions_1 = require("../../workbench-file-states.actions");
var WorkbenchComponent = /** @class */ (function () {
    function WorkbenchComponent(actions$, store, router, _hotkeysService, dialog, corrGen, activeRoute) {
        var _this = this;
        this.actions$ = actions$;
        this.store = store;
        this.router = router;
        this._hotkeysService = _hotkeysService;
        this.dialog = dialog;
        this.corrGen = corrGen;
        this.activeRoute = activeRoute;
        this.WorkbenchTool = workbench_state_2.WorkbenchTool;
        this.ViewMode = view_mode_1.ViewMode;
        this.useWcsCenter = false;
        this.currentSidebarView = sidebar_view_1.SidebarView.FILES;
        this.SidebarView = sidebar_view_1.SidebarView;
        this.hotKeys = [];
        this.fileEntities$ = this.store.select(data_files_state_1.DataFilesState.getEntities);
        this.files$ = this.store.select(data_files_state_1.DataFilesState.getDataFiles).pipe(operators_1.map(function (files) { return files.sort(function (a, b) { return a.name.localeCompare(b.name); }); }));
        this.primaryViewers$ = this.store.select(workbench_state_1.WorkbenchState.getPrimaryViewers);
        this.activeTool$ = this.store.select(workbench_state_1.WorkbenchState.getActiveTool);
        this.secondaryViewers$ = this.store.select(workbench_state_1.WorkbenchState.getSecondaryViewers);
        this.selectedFile$ = this.store.select(workbench_state_1.WorkbenchState.getActiveImageFile);
        this.viewers$ = this.store.select(workbench_state_1.WorkbenchState.getViewers);
        this.sidebarView$ = this.store.select(workbench_state_1.WorkbenchState.getSidebarView);
        this.showConfig$ = this.store.select(workbench_state_1.WorkbenchState.getShowConfig);
        this.showSidebar$ = this.store.select(workbench_state_1.WorkbenchState.getShowSidebar);
        this.loadingFiles$ = this.store.select(data_files_state_1.DataFilesState.getLoading);
        this.viewMode$ = this.store.select(workbench_state_1.WorkbenchState.getViewMode);
        this.activeViewerId$ = this.store.select(workbench_state_1.WorkbenchState.getActiveViewerId);
        this.activeViewer$ = this.store.select(workbench_state_1.WorkbenchState.getActiveViewer);
        this.dssImportLoading$ = store.select(workbench_state_1.WorkbenchState.getDssImportLoading);
        this.surveyDataProvider$ = this.store.select(data_providers_state_1.DataProvidersState.getDataProviders).pipe(operators_1.map(function (dataProviders) { return dataProviders.find(function (dp) { return dp.name == 'Imaging Surveys'; }); }));
        this.activeImageFile$ = store.select(workbench_state_1.WorkbenchState.getActiveImageFile);
        this.activeImageFileState$ = store.select(workbench_state_1.WorkbenchState.getActiveImageFileState);
        this.viewerFileIds$ = this.store.select(workbench_state_1.WorkbenchState.getViewerIds).pipe(operators_1.switchMap(function (viewerIds) {
            console.log("Viewer File Ids Change");
            return rxjs_1.combineLatest.apply(void 0, viewerIds.map(function (viewerId) {
                return _this.store.select(workbench_state_1.WorkbenchState.getViewerById).pipe(operators_1.map(function (fn) { return fn(viewerId).fileId; }), operators_1.distinctUntilChanged());
            }));
        }));
        this.viewerImageFiles$ = this.viewerFileIds$.pipe(operators_1.switchMap(function (fileIds) {
            return rxjs_1.combineLatest.apply(void 0, fileIds.map(function (fileId) {
                return _this.store.select(data_files_state_1.DataFilesState.getDataFileById).pipe(operators_1.map(function (fn) {
                    if (fileId == null || !fn(fileId) || fn(fileId).type != data_file_type_1.DataFileType.IMAGE)
                        return null;
                    return fn(fileId);
                }), operators_1.distinctUntilChanged());
            }));
        }));
        this.viewerFileCustomMarkers$ = rxjs_1.combineLatest(this.activeTool$, this.viewerFileIds$).pipe(operators_1.switchMap(function (_a) {
            var activeTool = _a[0], fileIds = _a[1];
            return rxjs_1.combineLatest.apply(void 0, fileIds.map(function (fileId) {
                if (activeTool != workbench_state_2.WorkbenchTool.CUSTOM_MARKER)
                    return rxjs_1.of([]);
                return _this.store.select(workbench_file_states_state_1.WorkbenchFileStates.getWorkbenchFileStateByFileId).pipe(operators_1.map(function (fn) {
                    return fn(fileId).marker;
                }), operators_1.distinctUntilChanged(), operators_1.map(function (markerFileState) { return Object.values(markerFileState.entities); }));
            }));
        }));
        this.markerOverlaySub = rxjs_1.combineLatest(this.viewerFileCustomMarkers$).pipe(operators_1.withLatestFrom(this.viewers$)).subscribe(function (_a) {
            var viewerCustomMarkers = _a[0][0], viewers = _a[1];
            viewers.forEach(function (viewer, index) {
                _this.store.dispatch(new workbench_actions_1.SetViewerMarkers(viewer.viewerId, Object.values(viewerCustomMarkers[index])));
            });
        });
        this.fileLoaderSub = this.viewerFileIds$.subscribe(function (ids) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            ids.forEach(function (id) {
                var f = dataFiles[id];
                if (!f || ((f.headerLoaded || f.headerLoading) && (f.type != data_file_type_1.DataFileType.IMAGE || (f.histLoaded || f.histLoading))))
                    return;
                _this.store.dispatch(new data_files_actions_1.LoadDataFile(id));
            });
        });
        this.viewerSyncEnabled$ = store.select(workbench_state_1.WorkbenchState.getViewerSyncEnabled);
        this.normalizationSyncEnabled$ = store.select(workbench_state_1.WorkbenchState.getNormalizationSyncEnabled);
        this.fullScreenPanel$ = this.store.select(workbench_state_1.WorkbenchState.getFullScreenPanel);
        this.inFullScreenMode$ = this.store.select(workbench_state_1.WorkbenchState.getInFullScreenMode);
        this.queryParamSub = this.activeRoute.queryParams.subscribe(function (p) {
            var tool = workbench_state_2.WorkbenchTool.VIEWER;
            if (p.tool && Object.values(workbench_state_2.WorkbenchTool).includes(p.tool)) {
                tool = p.tool;
            }
            _this.store.dispatch(new workbench_actions_1.SetActiveTool(tool));
        });
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('d', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
            _this.store.dispatch(new router_plugin_1.Navigate([], { tool: workbench_state_2.WorkbenchTool.VIEWER }, { relativeTo: _this.activeRoute, queryParamsHandling: 'merge' }));
            return false; // Prevent bubbling
        }, undefined, 'Display Settings'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('i', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
            _this.store.dispatch(new router_plugin_1.Navigate([], { tool: workbench_state_2.WorkbenchTool.INFO }, { relativeTo: _this.activeRoute, queryParamsHandling: 'merge' }));
            return false; // Prevent bubbling
        }, undefined, 'File Info'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('m', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
            _this.store.dispatch(new workbench_actions_1.SetActiveTool(workbench_state_2.WorkbenchTool.CUSTOM_MARKER));
            return false; // Prevent bubbling
        }, undefined, 'Markers'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('P', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
            _this.store.dispatch(new workbench_actions_1.SetActiveTool(workbench_state_2.WorkbenchTool.PLOTTER));
            return false; // Prevent bubbling
        }, undefined, 'Plotter'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('s', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
            _this.store.dispatch(new workbench_actions_1.SetActiveTool(workbench_state_2.WorkbenchTool.SONIFIER));
            return false; // Prevent bubbling
        }, undefined, 'Sonifier'));
        // this.hotKeys.push(new Hotkey('f', (event: KeyboardEvent): boolean => {
        //   this.store.dispatch(new SetShowConfig(true));
        //   this.store.dispatch(new Navigate([this.FIELD_CAL_ROUTE]);
        //   return false; // Prevent bubbling
        // }, undefined, 'Field Calibration'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('p', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
            _this.store.dispatch(new workbench_actions_1.SetActiveTool(workbench_state_2.WorkbenchTool.PHOTOMETRY));
            return false; // Prevent bubbling
        }, undefined, 'Photometry'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('/', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
            _this.store.dispatch(new workbench_actions_1.SetActiveTool(workbench_state_2.WorkbenchTool.IMAGE_CALC));
            return false; // Prevent bubbling
        }, undefined, 'Image Arithmetic'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('a', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
            _this.store.dispatch(new workbench_actions_1.SetActiveTool(workbench_state_2.WorkbenchTool.ALIGNER));
            return false; // Prevent bubbling
        }, undefined, 'Aligning'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('S', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
            _this.store.dispatch(new workbench_actions_1.SetActiveTool(workbench_state_2.WorkbenchTool.STACKER));
            return false; // Prevent bubbling
        }, undefined, 'Stacking'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('esc', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetFullScreen(false));
            return false; // Prevent bubbling
        }, undefined, 'Reset workbench views'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('1', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetFullScreen(true));
            _this.store.dispatch(new workbench_actions_1.SetFullScreenPanel('file'));
            _this.store.dispatch(new workbench_actions_1.ShowSidebar());
            return false; // Prevent bubbling
        }, undefined, 'Show workbench file panel'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('2', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetFullScreen(true));
            _this.store.dispatch(new workbench_actions_1.SetFullScreenPanel('viewer'));
            return false; // Prevent bubbling
        }, undefined, 'Show workbench file panel'));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey('3', function (event) {
            _this.store.dispatch(new workbench_actions_1.SetFullScreen(true));
            _this.store.dispatch(new workbench_actions_1.SetFullScreenPanel('tool'));
            _this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
            return false; // Prevent bubbling
        }, undefined, 'Show workbench file panel'));
        this.hotKeys.forEach(function (hotKey) { return _this._hotkeysService.add(hotKey); });
        // if(localStorage.getItem('previouslyVisited') != 'true') {
        //   localStorage.setItem('previouslyVisited', 'true')
        //   let dialogRef = this.dialog.open(TourDialogComponent);
        //   dialogRef.afterClosed().subscribe(result => {
        //     // console.log('The dialog was closed', result);
        //     if(result) this.tourService.start();
        //   });
        // }
        //this.loading$ = this.fileLibraryStore.loading$;
        // this.imageFiles$ = imageFileService.imageFiles$;
        // this.imageFileService.imageFile$.subscribe(imageFile => {
        //   this.selectedImageFile = imageFile;
        // });
        // this.selectedFile$.subscribe(selectedFile => {
        //   if(!selectedFile.loaded && !selectedFile.loading) this.fileLibraryStore.loadFile(selectedFile.id);
        // })
    }
    WorkbenchComponent.prototype.selectCustomMarkers = function (fileId, customMarkers) {
        this.store.dispatch(new workbench_file_states_actions_1.SelectCustomMarkers(fileId, customMarkers));
    };
    WorkbenchComponent.prototype.deselectCustomMarkers = function (fileId, customMarkers) {
        this.store.dispatch(new workbench_file_states_actions_1.DeselectCustomMarkers(fileId, customMarkers));
    };
    WorkbenchComponent.prototype.onImageClick = function ($event) {
        var activeTool = this.store.selectSnapshot(workbench_state_1.WorkbenchState.getActiveTool);
        switch (activeTool) {
            case workbench_state_2.WorkbenchTool.CUSTOM_MARKER: {
                var imageFileState = this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[$event.targetFile.id];
                var settings = this.store.selectSnapshot(workbench_state_1.WorkbenchState.getCustomMarkerPageSettings);
                var centroidSettings = this.store.selectSnapshot(workbench_state_1.WorkbenchState.getCentroidSettings);
                var selectedCustomMarkers = Object.values(imageFileState.marker.entities).filter(function (marker) { return marker.selected; });
                if ($event.hitImage) {
                    if (selectedCustomMarkers.length == 0 || $event.mouseEvent.altKey) {
                        var x = $event.imageX;
                        var y = $event.imageY;
                        if (settings.centroidClicks) {
                            var result = void 0;
                            if (settings.usePlanetCentroiding) {
                                result = centroider_1.centroidDisk($event.targetFile, x, y, centroidSettings.diskCentroiderSettings);
                            }
                            else {
                                result = centroider_1.centroidPsf($event.targetFile, x, y, centroidSettings.psfCentroiderSettings);
                            }
                            x = result.x;
                            y = result.y;
                        }
                        var customMarker = {
                            type: marker_1.MarkerType.CIRCLE,
                            label: null,
                            x: x,
                            y: y,
                            radius: 10,
                            labelGap: 8,
                            labelTheta: 0
                        };
                        this.store.dispatch(new workbench_file_states_actions_1.AddCustomMarkers($event.targetFile.id, [customMarker]));
                    }
                    else {
                        this.store.dispatch(new workbench_file_states_actions_1.SetCustomMarkerSelection($event.targetFile.id, []));
                    }
                }
                break;
            }
        }
    };
    WorkbenchComponent.prototype.onMarkerClick = function ($event) {
        var activeTool = this.store.selectSnapshot(workbench_state_1.WorkbenchState.getActiveTool);
        switch (activeTool) {
            case workbench_state_2.WorkbenchTool.CUSTOM_MARKER: {
                if ($event.mouseEvent.altKey)
                    return;
                // let customMarker = this.customMarkers.find(
                //   customMarker =>
                //     $event.marker.data && customMarker.id == $event.marker.data["id"]
                // );
                // if (!customMarker) return;
                // let customMarkerSelected = this.selectedCustomMarkers.includes(
                //   customMarker
                // );
                // if ($event.mouseEvent.ctrlKey) {
                //   if (!customMarkerSelected) {
                //     // select the source
                //     this.selectCustomMarkers([customMarker]);
                //   } else {
                //     // deselect the source
                //     this.deselectCustomMarkers([customMarker]);
                //   }
                // } else {
                //   this.store.dispatch(
                //     new SetCustomMarkerSelection([customMarker])
                //   );
                // }
                // $event.mouseEvent.stopImmediatePropagation();
                // $event.mouseEvent.preventDefault();
                break;
            }
        }
    };
    WorkbenchComponent.prototype.ngOnInit = function () {
        this.store.dispatch([new data_files_actions_1.LoadLibrary(), new workbench_actions_1.LoadCatalogs(), new workbench_actions_1.LoadFieldCals(), new data_providers_actions_1.LoadDataProviders()]);
    };
    WorkbenchComponent.prototype.ngOnDestroy = function () {
        var _this = this;
        this.hotKeys.forEach(function (hotKey) { return _this._hotkeysService.remove(hotKey); });
        this.fileLoaderSub.unsubscribe();
        this.queryParamSub.unsubscribe();
        this.markerOverlaySub.unsubscribe();
    };
    WorkbenchComponent.prototype.onFileSelect = function ($event) {
        if (!$event.file)
            return;
        if (!$event.doubleClick) {
            this.store.dispatch(new workbench_actions_1.SelectDataFile($event.file.id));
        }
        else {
            this.store.dispatch(new workbench_actions_1.KeepViewerOpen(this.store.selectSnapshot(workbench_state_1.WorkbenchState.getActiveViewerId)));
        }
    };
    // onMultiFileSelect(files: Array<DataFile>) {
    //   if(!files) return;
    //   this.store.dispatch(new SetMultiFileSelection(files.map(f => f.id)));
    // }
    WorkbenchComponent.prototype.removeAllFiles = function () {
        var _this = this;
        var dialogRef = this.dialog.open(confirmation_dialog_component_1.ConfirmationDialogComponent, {
            width: "300px",
            data: {
                message: "Are you sure you want to delete all files from your library?",
                confirmationBtn: {
                    color: 'warn',
                    label: 'Delete All Files'
                }
            }
        });
        dialogRef.afterClosed().subscribe(function (result) {
            if (result) {
                _this.store.dispatch(new data_files_actions_1.RemoveAllDataFiles());
            }
        });
    };
    WorkbenchComponent.prototype.refresh = function () {
        this.store.dispatch(new data_files_actions_1.LoadLibrary());
    };
    WorkbenchComponent.prototype.setSidebarView = function (value) {
        this.store.dispatch(new workbench_actions_1.SetSidebarView(value));
    };
    WorkbenchComponent.prototype.setViewModeOption = function ($event) {
        this.store.dispatch(new workbench_actions_1.SetViewMode($event.value));
    };
    WorkbenchComponent.prototype.onActiveViewerIdChange = function (value) {
        this.store.dispatch(new workbench_actions_1.SetActiveViewer(value));
    };
    WorkbenchComponent.prototype.onClickWorkbenchNav = function (isActiveUrl) {
        if (isActiveUrl) {
            // toggle
            this.store.dispatch(new workbench_actions_1.ToggleShowConfig());
        }
        else {
            // show
            this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
        }
    };
    WorkbenchComponent.prototype.onWorkbenchNavClick = function (currentTool, targetTool) {
        if (currentTool == targetTool) {
            // toggle
            this.store.dispatch(new workbench_actions_1.ToggleShowConfig());
        }
        else {
            // show
            this.store.dispatch(new workbench_actions_1.SetShowConfig(true));
        }
        this.store.dispatch(new router_plugin_1.Navigate([], { tool: targetTool }, { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }));
    };
    /* for data file selection list */
    WorkbenchComponent.prototype.trackByFn = function (index, item) {
        return item.id; // or item.id
    };
    WorkbenchComponent.prototype.getToolbarTooltip = function (isActive, base) {
        var showToolPanel = this.store.selectSnapshot(workbench_state_1.WorkbenchState.getShowConfig);
        return (showToolPanel && isActive ? 'Hide ' : 'Show ') + base;
    };
    WorkbenchComponent.prototype.onViewerSyncEnabledChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.SetViewerSyncEnabled($event.checked));
    };
    WorkbenchComponent.prototype.onNormalizationSyncEnabledChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.SetNormalizationSyncEnabled($event.checked));
    };
    WorkbenchComponent.prototype.importFromSurvey = function (surveyDataProvider, imageFile) {
        var centerRaDec;
        var pixelScale;
        if (imageFile.wcs && imageFile.wcs.isValid() && this.useWcsCenter) {
            centerRaDec = imageFile.wcs.pixToWorld([
                data_file_1.getWidth(imageFile) / 2,
                data_file_1.getHeight(imageFile) / 2
            ]);
            pixelScale = imageFile.wcs.getPixelScale() * 60;
        }
        else {
            var centerRa = data_file_1.getRaHours(imageFile);
            var centerDec = data_file_1.getDecDegs(imageFile);
            if (centerRa == undefined || centerDec == undefined)
                return;
            centerRaDec = [centerRa, centerDec];
            pixelScale = data_file_1.getDegsPerPixel(imageFile) * 60;
            if (pixelScale == undefined)
                return;
        }
        var width = pixelScale * data_file_1.getWidth(imageFile);
        var height = pixelScale * data_file_1.getHeight(imageFile);
        this.store.dispatch(new workbench_actions_1.ImportFromSurvey(surveyDataProvider.id, centerRaDec[0], centerRaDec[1], width, height, this.corrGen.next()));
    };
    // onUseWcsCenterChange($event: MatCheckboxChange) {
    //   this.useWcsCenter = $event.checked;
    // }
    WorkbenchComponent.prototype.onUseWcsCenterChange = function ($event) {
        this.useWcsCenter = $event.value == 'wcs';
    };
    WorkbenchComponent.prototype.moveToOtherView = function (viewer) {
        this.store.dispatch(new workbench_actions_1.MoveToOtherView(viewer.viewerId));
    };
    WorkbenchComponent = __decorate([
        core_1.Component({
            selector: 'app-workbench',
            templateUrl: './workbench.component.html',
            styleUrls: ['./workbench.component.scss'],
            changeDetection: core_1.ChangeDetectionStrategy.OnPush
        })
    ], WorkbenchComponent);
    return WorkbenchComponent;
}());
exports.WorkbenchComponent = WorkbenchComponent;
