"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.SonificationPanelComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var sonifier_file_state_1 = require("../../models/sonifier-file-state");
var data_file_1 = require("../../../data-files/models/data-file");
var angular2_hotkeys_1 = require("angular2-hotkeys");
var workbench_file_states_actions_1 = require("../../workbench-file-states.actions");
var transformation_1 = require("../../models/transformation");
var SonificationPanelComponent = /** @class */ (function () {
    function SonificationPanelComponent(afterglowService, _hotkeysService, ref, afterglowDataFileService, actions$, store, router) {
        var _this = this;
        this.afterglowService = afterglowService;
        this._hotkeysService = _hotkeysService;
        this.ref = ref;
        this.afterglowDataFileService = afterglowDataFileService;
        this.actions$ = actions$;
        this.store = store;
        this.router = router;
        this.hdu$ = new rxjs_1.BehaviorSubject(null);
        this.transformation$ = new rxjs_1.BehaviorSubject(null);
        this.state$ = new rxjs_1.BehaviorSubject(null);
        this.SonifierRegionMode = sonifier_file_state_1.SonifierRegionMode;
        this.sonificationUri = null;
        this.sonificationSrcUri = null;
        this.loading = false;
        this.showPlayer = false;
        this.viewportSize = null;
        this.hotKeys = [];
        this.subs = [];
        this.region$ = rxjs_1.combineLatest(this.hdu$, this.transformation$, this.state$).pipe(operators_1.filter(function (_a) {
            var hdu = _a[0], transformation = _a[1], state = _a[2];
            return state !== null && hdu !== null;
        }), operators_1.map(function (_a) {
            var hdu = _a[0], transformation = _a[1], state = _a[2];
            if (state.regionMode == sonifier_file_state_1.SonifierRegionMode.CUSTOM) {
                return state.regionHistory[state.regionHistoryIndex];
            }
            if (!hdu ||
                !hdu.headerLoaded ||
                !transformation ||
                !transformation.viewportSize ||
                !transformation.imageToViewportTransform) {
                return null;
            }
            return transformation_1.getViewportRegion(transformation, hdu.width, hdu.height);
        }));
        this.sonificationUri$ = this.region$.pipe(operators_1.map(function (region) {
            if (!region)
                return null;
            _this.sonificationUri = _this.afterglowDataFileService.getSonificationUri(_this.hdu.id, region, _this.state.duration, _this.state.toneCount);
            return _this.sonificationUri;
        }), operators_1.distinctUntilChanged());
        this.clearProgressLine$ = this.sonificationUri$.pipe(operators_1.filter(function (uri) {
            return _this.sonificationSrcUri != uri;
        }), operators_1.map(function () { return true; }), operators_1.tap(function () { return (_this.sonificationSrcUri = null); }));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("t 1", function (event) {
            if (_this.state.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByTime(0);
            return false; // Prevent bubbling
        }, undefined, "Time Navigation: Early"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("t 2", function (event) {
            if (_this.state.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByTime(1);
            return false; // Prevent bubbling
        }, undefined, "Time Navigation: Mid"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("t 3", function (event) {
            if (_this.state.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByTime(2);
            return false; // Prevent bubbling
        }, undefined, "Time Navigation: Late"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("f 1", function (event) {
            if (_this.state.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByFrequency(0);
            return false; // Prevent bubbling
        }, undefined, "Frequency Navigation: Low"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("f 2", function (event) {
            if (_this.state.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByFrequency(1);
            return false; // Prevent bubbling
        }, undefined, "Frequency Navigation: Mid"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("f 3", function (event) {
            if (_this.state.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.selectSubregionByFrequency(2);
            return false; // Prevent bubbling
        }, undefined, "Frequency Navigation: High"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("enter", function (event) {
            _this.sonify();
            _this.ref.markForCheck();
            return false; // Prevent bubbling
        }, undefined, "Play Sonification"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("space", function (event) {
            _this.sonify();
            _this.ref.markForCheck();
            return false; // Prevent bubbling
        }, undefined, "Play Sonification"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("esc", function (event) {
            if (_this.state.regionMode != sonifier_file_state_1.SonifierRegionMode.CUSTOM)
                return true;
            _this.resetRegionSelection();
            return false; // Prevent bubbling
        }, undefined, "Reset Sonification Region"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("ctrl+z", function (event) {
            _this.undoRegionSelection();
            return false; // Prevent bubbling
        }, undefined, "Undo Sonification Region"));
        this.hotKeys.push(new angular2_hotkeys_1.Hotkey("ctrl+y", function (event) {
            _this.redoRegionSelection();
            return false; // Prevent bubbling
        }, undefined, "Redo Sonification Region"));
        this.hotKeys.forEach(function (hotKey) { return _this._hotkeysService.add(hotKey); });
    }
    Object.defineProperty(SonificationPanelComponent.prototype, "hdu", {
        get: function () {
            return this.hdu$.getValue();
        },
        set: function (hdu) {
            this.hdu$.next(hdu);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SonificationPanelComponent.prototype, "transformation", {
        get: function () {
            return this.transformation$.getValue();
        },
        set: function (transformation) {
            this.transformation$.next(transformation);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SonificationPanelComponent.prototype, "state", {
        get: function () {
            return this.state$.getValue();
        },
        set: function (state) {
            this.state$.next(state);
        },
        enumerable: false,
        configurable: true
    });
    SonificationPanelComponent.prototype.ngOnInit = function () { };
    SonificationPanelComponent.prototype.ngAfterViewInit = function () { };
    SonificationPanelComponent.prototype.ngOnDestroy = function () {
        var _this = this;
        this.hotKeys.forEach(function (hotKey) { return _this._hotkeysService.remove(hotKey); });
    };
    SonificationPanelComponent.prototype.ngOnChanges = function () { };
    SonificationPanelComponent.prototype.selectSubregionByFrequency = function (subregion) {
        var region = this.state.regionHistory[this.state.regionHistoryIndex];
        this.store.dispatch(new workbench_file_states_actions_1.AddRegionToHistory(this.hdu.id, {
            x: region.x + subregion * (region.width / 4),
            y: region.y,
            width: region.width / 2,
            height: region.height
        }));
    };
    SonificationPanelComponent.prototype.selectSubregionByTime = function (subregion) {
        var region = this.state.regionHistory[this.state.regionHistoryIndex];
        this.store.dispatch(new workbench_file_states_actions_1.AddRegionToHistory(this.hdu.id, {
            x: region.x,
            y: region.y + subregion * (region.height / 4),
            width: region.width,
            height: region.height / 2
        }));
    };
    SonificationPanelComponent.prototype.resetRegionSelection = function () {
        // let region = this.lastSonifierStateConfig.region;
        // this.store.dispatch(new workbenchActions.ClearSonifierRegionHistory({file: this.lastImageFile}));
        this.store.dispatch(new workbench_file_states_actions_1.AddRegionToHistory(this.hdu.id, {
            x: 0.5,
            y: 0.5,
            width: data_file_1.getWidth(this.hdu),
            height: data_file_1.getHeight(this.hdu)
        }));
    };
    SonificationPanelComponent.prototype.undoRegionSelection = function () {
        this.store.dispatch(new workbench_file_states_actions_1.UndoRegionSelection(this.hdu.id));
    };
    SonificationPanelComponent.prototype.redoRegionSelection = function () {
        this.store.dispatch(new workbench_file_states_actions_1.RedoRegionSelection(this.hdu.id));
    };
    SonificationPanelComponent.prototype.setRegionMode = function ($event) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateSonifierFileState(this.hdu.id, {
            regionMode: $event.value
        }));
    };
    SonificationPanelComponent.prototype.setDuration = function (value) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateSonifierFileState(this.hdu.id, { duration: value }));
    };
    SonificationPanelComponent.prototype.setToneCount = function (value) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateSonifierFileState(this.hdu.id, { toneCount: value }));
    };
    SonificationPanelComponent.prototype.setViewportSync = function (value) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateSonifierFileState(this.hdu.id, {
            viewportSync: value.checked
        }));
    };
    SonificationPanelComponent.prototype.sonify = function () {
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
    SonificationPanelComponent.prototype.onPlayerReady = function (api) {
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
        var indexToneDuration = 0.852 / 2.0;
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
                Math.max(0, Math.min(1, (_this.api.getDefaultMedia().currentTime - indexToneDuration) /
                    (_this.api.getDefaultMedia().duration - 2 * indexToneDuration))) *
                    region.height;
            return { x1: region.x, y1: y, x2: region.x + region.width, y2: y };
        })), stop$.pipe(operators_1.map(function () { return null; })), this.clearProgressLine$.pipe(operators_1.map(function () { return null; })));
        this.subs.push(this.progressLine$.pipe(operators_1.distinctUntilChanged()).subscribe(function (line) {
            _this.store.dispatch(new workbench_file_states_actions_1.SetProgressLine(_this.hdu.id, line));
        }));
    };
    __decorate([
        core_1.Input("hdu")
    ], SonificationPanelComponent.prototype, "hdu");
    __decorate([
        core_1.Input("transformation")
    ], SonificationPanelComponent.prototype, "transformation");
    __decorate([
        core_1.Input("state")
    ], SonificationPanelComponent.prototype, "state");
    SonificationPanelComponent = __decorate([
        core_1.Component({
            selector: "app-sonification-panel",
            templateUrl: "./sonification-panel.component.html",
            styleUrls: ["./sonification-panel.component.css"]
        })
    ], SonificationPanelComponent);
    return SonificationPanelComponent;
}());
exports.SonificationPanelComponent = SonificationPanelComponent;
