"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.DisplayToolComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var environment_prod_1 = require("../../../../environments/environment.prod");
var workbench_file_states_actions_1 = require("../../workbench-file-states.actions");
// import { DataFile, ImageFile } from '../../../models'
// import { DataFileLibraryStore } from '../../../stores/data-file-library.store'
// import { ImageViewerComponent } from '../../../components/image-viewer/image-viewer.component'
var DisplayToolComponent = /** @class */ (function () {
    function DisplayToolComponent(corrGen, store, router) {
        var _this = this;
        this.corrGen = corrGen;
        this.store = store;
        this.router = router;
        this.classList = "fx-workbench-outlet";
        this.levels$ = new rxjs_1.Subject();
        this.backgroundPercentile$ = new rxjs_1.Subject();
        this.peakPercentile$ = new rxjs_1.Subject();
        this.upperPercentileDefault = environment_prod_1.appConfig.upperPercentileDefault;
        this.lowerPercentileDefault = environment_prod_1.appConfig.lowerPercentileDefault;
        this.levels$.pipe(operators_1.auditTime(25)).subscribe(function (value) {
            _this.store.dispatch(new workbench_file_states_actions_1.UpdateNormalizer(_this.imageFile.id, { backgroundPercentile: value.background, peakPercentile: value.peak }));
        });
        this.backgroundPercentile$.pipe(operators_1.auditTime(25)).subscribe(function (value) {
            _this.store.dispatch(new workbench_file_states_actions_1.UpdateNormalizer(_this.imageFile.id, { backgroundPercentile: value }));
        });
        this.peakPercentile$
            .pipe(operators_1.auditTime(25))
            .subscribe(function (value) {
            _this.store.dispatch(new workbench_file_states_actions_1.UpdateNormalizer(_this.imageFile.id, { peakPercentile: value }));
        });
    }
    DisplayToolComponent.prototype.onBackgroundPercentileChange = function (value) {
        this.backgroundPercentile$.next(value);
    };
    DisplayToolComponent.prototype.onPeakPercentileChange = function (value) {
        this.peakPercentile$.next(value);
    };
    DisplayToolComponent.prototype.onColorMapChange = function (value) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateNormalizer(this.imageFile.id, { colorMapName: value }));
    };
    DisplayToolComponent.prototype.onStretchModeChange = function (value) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateNormalizer(this.imageFile.id, { stretchMode: value }));
    };
    DisplayToolComponent.prototype.onInvertedChange = function (value) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateNormalizer(this.imageFile.id, { inverted: value }));
    };
    DisplayToolComponent.prototype.onPresetClick = function (lowerPercentile, upperPercentile) {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateNormalizer(this.imageFile.id, {
            backgroundPercentile: lowerPercentile,
            peakPercentile: upperPercentile
        }));
    };
    DisplayToolComponent.prototype.onInvertClick = function () {
        this.store.dispatch(new workbench_file_states_actions_1.UpdateNormalizer(this.imageFile.id, {
            backgroundPercentile: this.normalization.normalizer.peakPercentile,
            peakPercentile: this.normalization.normalizer.backgroundPercentile
        }));
    };
    DisplayToolComponent.prototype.onFlipClick = function () {
        this.store.dispatch(new workbench_file_states_actions_1.Flip(this.imageFile.id));
    };
    DisplayToolComponent.prototype.onRotateClick = function () {
        this.store.dispatch(new workbench_file_states_actions_1.RotateBy(this.imageFile.id, 90));
    };
    DisplayToolComponent.prototype.onResetOrientationClick = function () {
        this.store.dispatch(new workbench_file_states_actions_1.ResetImageTransform(this.imageFile.id));
    };
    DisplayToolComponent.prototype.ngOnInit = function () {
    };
    DisplayToolComponent.prototype.ngOnDestroy = function () {
    };
    DisplayToolComponent.prototype.ngAfterViewInit = function () { };
    __decorate([
        core_1.HostBinding("class"),
        core_1.Input("class")
    ], DisplayToolComponent.prototype, "classList");
    __decorate([
        core_1.Input()
    ], DisplayToolComponent.prototype, "imageFile");
    __decorate([
        core_1.Input()
    ], DisplayToolComponent.prototype, "normalization");
    DisplayToolComponent = __decorate([
        core_1.Component({
            selector: "app-display-tool",
            templateUrl: "./display-tool.component.html",
            styleUrls: ["./display-tool.component.scss"]
            //changeDetection: ChangeDetectionStrategy.OnPush
        })
    ], DisplayToolComponent);
    return DisplayToolComponent;
}());
exports.DisplayToolComponent = DisplayToolComponent;
