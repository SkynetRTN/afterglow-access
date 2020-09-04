"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.WorkbenchPageBaseComponent = void 0;
var core_1 = require("@angular/core");
var moment_ = require("moment");
var moment = moment_;
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var workbench_state_1 = require("../../../workbench.state");
var data_files_state_1 = require("../../../../data-files/data-files.state");
var data_file_type_1 = require("../../../../data-files/models/data-file-type");
var WorkbenchPageBaseComponent = /** @class */ (function () {
    function WorkbenchPageBaseComponent(store, router) {
        var _this = this;
        this.store = store;
        this.router = router;
        this.fullScreenPanel$ = this.store.select(workbench_state_1.WorkbenchState.getFullScreenPanel);
        this.inFullScreenMode$ = this.store.select(workbench_state_1.WorkbenchState.getInFullScreenMode);
        this.showConfig$ = store.select(workbench_state_1.WorkbenchState.getShowConfig);
        this.activeImageFile$ = store.select(workbench_state_1.WorkbenchState.getActiveImageFile);
        this.activeImageFileLoaded$ = this.activeImageFile$.pipe(operators_1.filter(function (f) { return f.headerLoaded && f.histLoaded; }));
        this.activeImageFileState$ = store.select(workbench_state_1.WorkbenchState.getActiveImageFileState);
        this.allImageFiles$ = store.select(data_files_state_1.DataFilesState.getImageFiles);
        this.viewMode$ = this.store.select(workbench_state_1.WorkbenchState.getViewMode);
        this.primaryViewers$ = this.store.select(workbench_state_1.WorkbenchState.getPrimaryViewers);
        this.secondaryViewers$ = this.store.select(workbench_state_1.WorkbenchState.getSecondaryViewers);
        this.activeViewerId$ = this.store.select(workbench_state_1.WorkbenchState.getActiveViewerId);
        this.activeViewer$ = this.store.select(workbench_state_1.WorkbenchState.getActiveViewer);
        this.viewerFileIds$ = this.store.select(workbench_state_1.WorkbenchState.getViewerIds).pipe(operators_1.switchMap(function (viewerIds) {
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
        this.viewerImageFileHeaders$ = this.viewerFileIds$.pipe(operators_1.switchMap(function (fileIds) {
            return rxjs_1.combineLatest.apply(void 0, fileIds.map(function (fileId) {
                return _this.store.select(data_files_state_1.DataFilesState.getDataFileById).pipe(operators_1.map(function (fn) {
                    if (fileId == null || !fn(fileId) || fn(fileId).type != data_file_type_1.DataFileType.IMAGE)
                        return null;
                    return fn(fileId).header;
                }), operators_1.distinctUntilChanged());
            }));
        }));
        // this.fileLoaderSub = this.viewerFileIds$.subscribe(ids => {
        //   let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
        //   ids.forEach(id => {
        //     let f = dataFiles[id];
        //     if(!f || ( (f.headerLoaded || f.headerLoading) && (f.type != DataFileType.IMAGE || ((f as ImageFile).histLoaded || (f as ImageFile).histLoading)))) return;
        //     this.store.dispatch(new LoadDataFile(id));
        //   })
        // })
    }
    WorkbenchPageBaseComponent.prototype.ngOnDestroy = function () {
        // this.fileLoaderSub.unsubscribe();
    };
    WorkbenchPageBaseComponent = __decorate([
        core_1.Component({
            selector: "app-workbench-page-base",
            template: "",
            styleUrls: ["./workbench-page-base.component.css"]
        })
    ], WorkbenchPageBaseComponent);
    return WorkbenchPageBaseComponent;
}());
exports.WorkbenchPageBaseComponent = WorkbenchPageBaseComponent;
