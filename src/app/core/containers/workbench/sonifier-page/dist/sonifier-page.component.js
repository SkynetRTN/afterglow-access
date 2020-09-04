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
exports.__esModule = true;
exports.SonifierPageComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var sonifier_file_state_1 = require("../../../models/sonifier-file-state");
var data_file_1 = require("../../../../data-files/models/data-file");
var marker_1 = require("../../../models/marker");
var workbench_state_1 = require("../../../models/workbench-state");
var angular2_hotkeys_1 = require("../../../../../../node_modules/angular2-hotkeys");
var workbench_state_2 = require("../../../workbench.state");
var workbench_actions_1 = require("../../../workbench.actions");
var workbench_file_states_actions_1 = require("../../../workbench-file-states.actions");
var transformation_1 = require("../../../models/transformation");
var workbench_file_states_state_1 = require("../../../workbench-file-states.state");
var workbench_page_base_component_1 = require("../workbench-page-base/workbench-page-base.component");
var data_files_state_1 = require("../../../../data-files/data-files.state");
var SonifierPageComponent = /** @class */ (function (_super) {
    __extends(SonifierPageComponent, _super);
    function SonifierPageComponent(afterglowService, _hotkeysService, ref, afterglowDataFileService, actions$, store, router) {
        var _this = _super.call(this, store, router) || this;
        _this.afterglowService = afterglowService;
        _this._hotkeysService = _hotkeysService;
        _this.ref = ref;
        _this.afterglowDataFileService = afterglowDataFileService;
        _this.actions$ = actions$;
        _this.classList = "fx-workbench-outlet";
        _this.sonificationSrcUri = null;
        _this.hotKeys = [];
        _this.SonifierRegionMode = sonifier_file_state_1.SonifierRegionMode;
        _this.showPlayer = false;
        _this.viewportSize = null;
        _this.subs = [];
        _this.sonifierState$ = _this.activeImageFileState$.pipe(operators_1.filter(function (state) { return state != null; }), operators_1.map(function (state) { return state.sonifier; }));
        _this.region$ = rxjs_1.combineLatest(_this.activeImageFile$, _this.activeImageFileState$, _this.sonifierState$).pipe(operators_1.map(function (_a) {
            var imageFile = _a[0], imageFileState = _a[1], sonifierState = _a[2];
            if (sonifierState.regionMode == sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return sonifierState.regionHistory[sonifierState.regionHistoryIndex];
            if (!imageFile || !imageFile.headerLoaded || !imageFileState.transformation || !imageFileState.transformation.viewportSize || !imageFileState.transformation.imageToViewportTransform)
                return null;
            return transformation_1.getViewportRegion(imageFileState.transformation, imageFile);
        }));
        _this.sonificationUri$ = rxjs_1.combineLatest(_this.region$, _this.activeImageFile$, _this.sonifierState$).pipe(operators_1.map(function (_a) {
            var region = _a[0], imageFile = _a[1], sonifierState = _a[2];
            if (!region)
                return null;
            return _this.afterglowDataFileService.getSonificationUri(imageFile.id, region, sonifierState.duration, sonifierState.toneCount);
        }), operators_1.distinctUntilChanged());
        _this.clearProgressLine$ = _this.sonificationUri$.pipe(operators_1.filter(function (uri) {
            return _this.sonificationSrcUri != uri;
        }), operators_1.map(function () { return true; }), operators_1.tap(function () { return _this.sonificationSrcUri = null; }));
        _this.markerUpdater = rxjs_1.combineLatest(_this.viewerFileIds$, _this.viewerImageFileHeaders$, _this.store.select(workbench_file_states_state_1.WorkbenchFileStates.getEntities)).pipe(operators_1.withLatestFrom(_this.store.select(workbench_state_2.WorkbenchState.getViewers), _this.store.select(data_files_state_1.DataFilesState.getEntities), _this.store.select(workbench_state_2.WorkbenchState.getActiveTool))).subscribe(function (_a) {
            var _b = _a[0], fileIds = _b[0], imageFiles = _b[1], imageFileStates = _b[2], viewers = _a[1], dataFiles = _a[2], activeTool = _a[3];
            if (activeTool != workbench_state_1.WorkbenchTool.SONIFIER)
                return;
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
                var sonifier = imageFileStates[fileId].sonifier;
                var region = sonifier.regionHistory[sonifier.regionHistoryIndex];
                var regionMode = sonifier.regionMode;
                var progressLine = sonifier.progressLine;
                var markers = [];
                if (region && regionMode == sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                    markers.push(__assign({ type: marker_1.MarkerType.RECTANGLE }, region));
                if (progressLine)
                    markers.push(__assign({ type: marker_1.MarkerType.LINE }, progressLine));
                _this.store.dispatch(new workbench_actions_1.SetViewerMarkers(viewer.viewerId, markers));
            });
        });
        _this.subs.push(_this.sonificationUri$.subscribe(function (uri) { _this.sonificationUri = uri; }));
        _this.subs.push(_this.region$.subscribe(function (region) { _this.lastRegion = region; }));
        _this.subs.push(_this.activeImageFile$.subscribe(function (imageFile) { return (_this.lastImageFile = imageFile); }));
        // this.subs.push(
        //   this.sonifierState$.subscribe(sonifierState => {
        //     this.lastSonifierState = sonifierState;
        //     if (
        //       sonifierState &&
        //       this.sonificationSrcUri != sonifierState.sonificationUri
        //     )
        //       this.sonificationSrcUri = null;
        //   })
        // );
        _this.hotKeys.push(new angular2_hotkeys_1.Hotkey("t 1", function (event) {
            if (_this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[_this.lastImageFile.id].sonifier.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByTime(0);
            return false; // Prevent bubbling
        }, undefined, "Time Navigation: Early"));
        _this.hotKeys.push(new angular2_hotkeys_1.Hotkey("t 2", function (event) {
            if (_this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[_this.lastImageFile.id].sonifier.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByTime(1);
            return false; // Prevent bubbling
        }, undefined, "Time Navigation: Mid"));
        _this.hotKeys.push(new angular2_hotkeys_1.Hotkey("t 3", function (event) {
            if (_this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[_this.lastImageFile.id].sonifier.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByTime(2);
            return false; // Prevent bubbling
        }, undefined, "Time Navigation: Late"));
        _this.hotKeys.push(new angular2_hotkeys_1.Hotkey("f 1", function (event) {
            if (_this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[_this.lastImageFile.id].sonifier.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByFrequency(0);
            return false; // Prevent bubbling
        }, undefined, "Frequency Navigation: Low"));
        _this.hotKeys.push(new angular2_hotkeys_1.Hotkey("f 2", function (event) {
            if (_this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[_this.lastImageFile.id].sonifier.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByFrequency(1);
            return false; // Prevent bubbling
        }, undefined, "Frequency Navigation: Mid"));
        _this.hotKeys.push(new angular2_hotkeys_1.Hotkey("f 3", function (event) {
            if (_this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[_this.lastImageFile.id].sonifier.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByFrequency(2);
            return false; // Prevent bubbling
        }, undefined, "Frequency Navigation: High"));
        _this.hotKeys.push(new angular2_hotkeys_1.Hotkey("enter", function (event) {
            _this.sonify();
            _this.ref.markForCheck();
            return false; // Prevent bubbling
        }, undefined, "Play Sonification"));
        _this.hotKeys.push(new angular2_hotkeys_1.Hotkey("space", function (event) {
            _this.sonify();
            _this.ref.markForCheck();
            return false; // Prevent bubbling
        }, undefined, "Play Sonification"));
        _this.hotKeys.push(new angular2_hotkeys_1.Hotkey("esc", function (event) {
            if (_this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[_this.lastImageFile.id].sonifier.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.resetRegionSelection();
            return false; // Prevent bubbling
        }, undefined, "Reset Sonification Region"));
        _this.hotKeys.push(new angular2_hotkeys_1.Hotkey("ctrl+z", function (event) {
            _this.undoRegionSelection();
            return false; // Prevent bubbling
        }, undefined, "Undo Sonification Region"));
        _this.hotKeys.push(new angular2_hotkeys_1.Hotkey("ctrl+y", function (event) {
            _this.redoRegionSelection();
            return false; // Prevent bubbling
        }, undefined, "Redo Sonification Region"));
        _this.hotKeys.forEach(function (hotKey) { return _this._hotkeysService.add(hotKey); });
        return _this;
    }
    SonifierPageComponent.prototype.ngOnInit = function () {
    };
    SonifierPageComponent.prototype.ngAfterViewInit = function () { };
    SonifierPageComponent.prototype.ngOnDestroy = function () {
        var _this = this;
        this.store.dispatch(new workbench_actions_1.ClearViewerMarkers());
        this.subs.forEach(function (sub) { return sub.unsubscribe(); });
        this.hotKeys.forEach(function (hotKey) { return _this._hotkeysService.remove(hotKey); });
        this.markerUpdater.unsubscribe();
    };
    SonifierPageComponent.prototype.ngOnChanges = function () { };
    SonifierPageComponent.prototype.selectSubregionByFrequency = function (subregion) {
        var sonifierState = this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[this.lastImageFile.id].sonifier;
        var region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
        this.store.dispatch(new workbench_file_states_actions_1.AddRegionToHistory(this.lastImageFile.id, {
            x: region.x + subregion * (region.width / 4),
            y: region.y,
            width: region.width / 2,
            height: region.height
        }));
    };
    SonifierPageComponent.prototype.selectSubregionByTime = function (subregion) {
        var sonifierState = this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[this.lastImageFile.id].sonifier;
        var region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
        this.store.dispatch(new workbench_file_states_actions_1.AddRegionToHistory(this.lastImageFile.id, {
            x: region.x,
            y: region.y + subregion * (region.height / 4),
            width: region.width,
            height: region.height / 2
        }));
    };
    SonifierPageComponent.prototype.resetRegionSelection = function () {
        // let region = this.lastSonifierStateConfig.region;
        // this.store.dispatch(new workbenchActions.ClearSonifierRegionHistory({file: this.lastImageFile}));
        this.store.dispatch(new workbench_file_states_actions_1.AddRegionToHistory(this.lastImageFile.id, {
            x: 0.5,
            y: 0.5,
            width: data_file_1.getWidth(this.lastImageFile),
            height: data_file_1.getHeight(this.lastImageFile)
        }));
    };
    SonifierPageComponent.prototype.undoRegionSelection = function () {
        this.store.dispatch(new workbench_file_states_actions_1.UndoRegionSelection(this.lastImageFile.id));
    };
    SonifierPageComponent.prototype.redoRegionSelection = function () {
        this.store.dispatch(new workbench_file_states_actions_1.RedoRegionSelection(this.lastImageFile.id));
    };
    SonifierPageComponent.prototype.setRegionMode = function ($event) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateSonifierFileState(this.lastImageFile.id, { regionMode: $event.value }));
    };
    SonifierPageComponent.prototype.setDuration = function (value) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateSonifierFileState(this.lastImageFile.id, { duration: value }));
    };
    SonifierPageComponent.prototype.setToneCount = function (value) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateSonifierFileState(this.lastImageFile.id, { toneCount: value }));
    };
    SonifierPageComponent.prototype.setViewportSync = function (value) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateSonifierFileState(this.lastImageFile.id, { viewportSync: value.checked }));
    };
    SonifierPageComponent.prototype.sonify = function () {
        if (!this.sonificationUri)
            return;
        if (this.sonificationSrcUri == this.sonificationUri &&
            this.api &&
            this.api.canPlay) {
            this.api.getDefaultMedia().play();
        }
        else {
            this.sonificationSrcUri = this.sonificationUri;
        }
    };
    SonifierPageComponent.prototype.onPlayerReady = function (api) {
        var _this = this;
        this.api = api;
        var stop$ = rxjs_1.from(this.api.getDefaultMedia().subscriptions.ended);
        var start$ = rxjs_1.from(this.api.getDefaultMedia().subscriptions.playing);
        this.subs.push(rxjs_1.from(this.api.getDefaultMedia().subscriptions.canPlayThrough).subscribe(function (canPlayThrough) {
            _this.loading = false;
        }));
        this.subs.push(rxjs_1.from(this.api.getDefaultMedia().subscriptions.loadStart).subscribe(function (canPlayThrough) {
            _this.loading = true;
        }));
        var indexToneDuration = .852 / 2.0;
        this.progressLine$ = rxjs_1.merge(start$.pipe(operators_1.flatMap(function () {
            return rxjs_1.interval(10).pipe(operators_1.takeUntil(rxjs_1.merge(stop$, _this.clearProgressLine$)));
        }), operators_1.withLatestFrom(this.region$), operators_1.map(function (_a) {
            var v = _a[0], region = _a[1];
            if (!_this.api.getDefaultMedia())
                return null;
            if (!_this.api.getDefaultMedia().duration)
                return null;
            if (!region)
                return null;
            // console.log(region, this.api.getDefaultMedia().currentTime, indexToneDuration, this.api.getDefaultMedia().duration);
            var y = region.y +
                Math.max(0, Math.min(1, ((_this.api.getDefaultMedia().currentTime - indexToneDuration) /
                    (_this.api.getDefaultMedia().duration - (2 * indexToneDuration))))) *
                    region.height;
            return { x1: region.x, y1: y, x2: region.x + region.width, y2: y };
        })), stop$.pipe(operators_1.map(function () { return null; })), this.clearProgressLine$.pipe(operators_1.map(function () { return null; })));
        this.subs.push(this.progressLine$.pipe(operators_1.distinctUntilChanged()).subscribe(function (line) {
            _this.store.dispatch(new workbench_file_states_actions_1.SetProgressLine(_this.lastImageFile.id, line));
        }));
    };
    __decorate([
        core_1.HostBinding("class"),
        core_1.Input("class")
    ], SonifierPageComponent.prototype, "classList");
    SonifierPageComponent = __decorate([
        core_1.Component({
            selector: "app-sonifier-page",
            templateUrl: "./sonifier-page.component.html",
            styleUrls: ["./sonifier-page.component.css"]
        })
    ], SonifierPageComponent);
    return SonifierPageComponent;
}(workbench_page_base_component_1.WorkbenchPageBaseComponent));
exports.SonifierPageComponent = SonifierPageComponent;
