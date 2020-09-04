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
exports.WorkbenchViewerGridComponent = void 0;
var core_1 = require("@angular/core");
var data_file_1 = require("../../../../data-files/models/data-file");
var view_mode_1 = require("../../../models/view-mode");
var data_files_state_1 = require("../../../../data-files/data-files.state");
var workbench_file_states_state_1 = require("../../../workbench-file-states.state");
var workbench_actions_1 = require("../../../workbench.actions");
var angular2_hotkeys_1 = require("angular2-hotkeys");
var workbench_file_states_actions_1 = require("../../../workbench-file-states.actions");
var WorkbenchViewerGridComponent = /** @class */ (function () {
    function WorkbenchViewerGridComponent(store, _hotkeysService) {
        // this.viewMode$ = this.store.select(WorkbenchState.getViewMode);
        var _this = this;
        this.store = store;
        this._hotkeysService = _hotkeysService;
        this.ViewMode = view_mode_1.ViewMode;
        this.onImageClick = new core_1.EventEmitter();
        this.onImageMove = new core_1.EventEmitter();
        this.onMarkerClick = new core_1.EventEmitter();
        this.hotKeys = [];
        this.subs = [];
        this.zoomStepFactor = 0.75;
        // this.viewers$ = combineLatest(this.store.select(WorkbenchState.getViewers), this.viewMode$)
        //   .pipe(map(([viewers, viewMode]) => {
        //     if (!viewers || viewers.length == 0) return [];
        //     if (viewMode == ViewMode.SINGLE) return [viewers[0]];
        //     return viewers;
        //   }));
        // this.activeViewerIndex$ = this.store.select(WorkbenchState.getActiveViewerIndex);
        this.files$ = this.store.select(data_files_state_1.DataFilesState.getEntities);
        this.fileStates$ = this.store.select(workbench_file_states_state_1.WorkbenchFileStates.getEntities);
        // this.subs.push(this.activeViewerIndex$.subscribe(viewerIndex => {
        //   this.activeViewerIndex = viewerIndex;
        // }))
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("=", function (event) {
            var activeViewer = _this.viewers.find(function (v) { return v.viewerId == _this.activeViewerId; });
            if (activeViewer && activeViewer.fileId != null) {
                _this.zoomIn(activeViewer.fileId);
            }
            return false; // Prevent bubbling
        }, undefined, "Zoom In"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("-", function (event) {
            var activeViewer = _this.viewers.find(function (v) { return v.viewerId == _this.activeViewerId; });
            if (activeViewer && activeViewer.fileId != null) {
                _this.zoomOut(activeViewer.fileId);
            }
            return false; // Prevent bubbling
        }, undefined, "Zoom In"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("0", function (event) {
            var activeViewer = _this.viewers.find(function (v) { return v.viewerId == _this.activeViewerId; });
            if (activeViewer && activeViewer.fileId != null) {
                _this.zoomTo(activeViewer.fileId, 1);
            }
            return false; // Prevent bubbling
        }, undefined, "Reset Zoom"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("z", function (event) {
            var activeViewer = _this.viewers.find(function (v) { return v.viewerId == _this.activeViewerId; });
            if (activeViewer && activeViewer.fileId != null) {
                _this.zoomToFit(activeViewer.fileId);
            }
            return false; // Prevent bubbling
        }, undefined, "Zoom To Fit"));
        this.hotKeys.forEach(function (hotKey) { return _this._hotkeysService.add(hotKey); });
    }
    WorkbenchViewerGridComponent.prototype.zoomIn = function (fileId, imageAnchor) {
        if (imageAnchor === void 0) { imageAnchor = null; }
        this.zoomBy(fileId, 1.0 / this.zoomStepFactor, imageAnchor);
    };
    WorkbenchViewerGridComponent.prototype.zoomOut = function (fileId, imageAnchor) {
        if (imageAnchor === void 0) { imageAnchor = null; }
        this.zoomBy(fileId, this.zoomStepFactor, imageAnchor);
    };
    WorkbenchViewerGridComponent.prototype.zoomBy = function (fileId, factor, imageAnchor) {
        if (imageAnchor === void 0) { imageAnchor = null; }
        this.store.dispatch(new workbench_file_states_actions_1.ZoomBy(fileId, factor, imageAnchor));
    };
    WorkbenchViewerGridComponent.prototype.zoomToFit = function (fileId, padding) {
        if (padding === void 0) { padding = 0; }
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        var imageFile = dataFiles[fileId];
        if (imageFile) {
            this.store.dispatch(new workbench_file_states_actions_1.CenterRegionInViewport(fileId, { x: 1, y: 1, width: data_file_1.getWidth(imageFile), height: data_file_1.getHeight(imageFile) }));
        }
    };
    WorkbenchViewerGridComponent.prototype.zoomTo = function (fileId, value) {
        this.store.dispatch(new workbench_file_states_actions_1.ZoomTo(fileId, value, null));
    };
    WorkbenchViewerGridComponent.prototype.ngOnInit = function () {
    };
    WorkbenchViewerGridComponent.prototype.ngOnDestroy = function () {
        var _this = this;
        this.hotKeys.forEach(function (hotKey) { return _this._hotkeysService.remove(hotKey); });
    };
    WorkbenchViewerGridComponent.prototype.viewerTrackByFn = function (index, item) {
        return index;
    };
    WorkbenchViewerGridComponent.prototype.setActiveViewer = function ($event, viewerId, viewer) {
        this.mouseDownActiveViewerId = this.activeViewerId;
        if (viewerId != this.activeViewerId) {
            this.store.dispatch(new workbench_actions_1.SetActiveViewer(viewerId));
            $event.preventDefault();
            $event.stopImmediatePropagation();
        }
    };
    WorkbenchViewerGridComponent.prototype.handleImageMove = function ($event, viewerId, viewer) {
        this.onImageMove.emit(__assign({ viewerId: viewerId, viewer: viewer }, $event));
    };
    WorkbenchViewerGridComponent.prototype.handleImageClick = function ($event, viewerId, viewer) {
        if (viewerId != this.mouseDownActiveViewerId)
            return;
        this.onImageClick.emit(__assign({ viewerId: viewerId, viewer: viewer }, $event));
    };
    WorkbenchViewerGridComponent.prototype.handleMarkerClick = function ($event, viewerId, viewer) {
        if (viewerId != this.mouseDownActiveViewerId)
            return;
        this.onMarkerClick.emit(__assign({ viewerId: viewerId, viewer: viewer }, $event));
    };
    __decorate([
        core_1.Input()
    ], WorkbenchViewerGridComponent.prototype, "viewers");
    __decorate([
        core_1.Input()
    ], WorkbenchViewerGridComponent.prototype, "activeViewerId");
    __decorate([
        core_1.Input()
    ], WorkbenchViewerGridComponent.prototype, "viewMode");
    __decorate([
        core_1.Output()
    ], WorkbenchViewerGridComponent.prototype, "onImageClick");
    __decorate([
        core_1.Output()
    ], WorkbenchViewerGridComponent.prototype, "onImageMove");
    __decorate([
        core_1.Output()
    ], WorkbenchViewerGridComponent.prototype, "onMarkerClick");
    WorkbenchViewerGridComponent = __decorate([
        core_1.Component({
            selector: 'app-workbench-viewer-grid',
            templateUrl: './workbench-viewer-grid.component.html',
            styleUrls: ['./workbench-viewer-grid.component.css']
        })
    ], WorkbenchViewerGridComponent);
    return WorkbenchViewerGridComponent;
}());
exports.WorkbenchViewerGridComponent = WorkbenchViewerGridComponent;
