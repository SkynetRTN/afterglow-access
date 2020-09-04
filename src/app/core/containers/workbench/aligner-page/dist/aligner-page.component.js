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
exports.AlignerPageComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var forms_1 = require("@angular/forms");
var workbench_state_1 = require("../../../workbench.state");
var workbench_actions_1 = require("../../../workbench.actions");
var jobs_state_1 = require("../../../../jobs/jobs.state");
var workbench_page_base_component_1 = require("../workbench-page-base/workbench-page-base.component");
var AlignerPageComponent = /** @class */ (function (_super) {
    __extends(AlignerPageComponent, _super);
    function AlignerPageComponent(store, router) {
        var _this = _super.call(this, store, router) || this;
        _this.classList = 'fx-workbench-outlet';
        _this.alignForm = new forms_1.FormGroup({
            selectedImageFileIds: new forms_1.FormControl([], forms_1.Validators.required),
            mode: new forms_1.FormControl('', forms_1.Validators.required),
            inPlace: new forms_1.FormControl(false, forms_1.Validators.required)
        });
        _this.alignFormData$ = store.select(workbench_state_1.WorkbenchState.getState).pipe(operators_1.map(function (state) { return state.aligningPageSettings.alignFormData; }), operators_1.tap(function (data) {
            _this.alignForm.patchValue(data, { emitEvent: false });
        }));
        _this.alignFormData$.subscribe();
        _this.selectedImageFiles$ = rxjs_1.combineLatest(_this.allImageFiles$, _this.alignFormData$).pipe(operators_1.map(function (_a) {
            var allImageFiles = _a[0], alignFormData = _a[1];
            return alignFormData.selectedImageFileIds.map(function (id) { return allImageFiles.find(function (f) { return f.id == id; }); });
        }));
        _this.alignForm.valueChanges.subscribe(function (value) {
            // if(this.imageCalcForm.valid) {
            _this.store.dispatch(new workbench_actions_1.UpdateAligningPageSettings({ alignFormData: _this.alignForm.value }));
            // }
        });
        _this.activeImageIsSelected$ = rxjs_1.combineLatest(_this.activeImageFile$, _this.selectedImageFiles$).pipe(operators_1.map(function (_a) {
            var activeImageFile = _a[0], selectedImageFiles = _a[1];
            return selectedImageFiles.find(function (f) { return activeImageFile && f.id == activeImageFile.id; }) != undefined;
        }));
        _this.activeImageHasWcs$ = _this.activeImageFile$.pipe(operators_1.map(function (imageFile) { return imageFile != null && imageFile.headerLoaded && imageFile.wcs.isValid(); }));
        _this.alignmentJobRow$ = rxjs_1.combineLatest(store.select(workbench_state_1.WorkbenchState.getState), store.select(jobs_state_1.JobsState.getEntities)).pipe(operators_1.map(function (_a) {
            var state = _a[0], jobRowLookup = _a[1];
            if (!state.aligningPageSettings.currentAlignmentJobId || !jobRowLookup[state.aligningPageSettings.currentAlignmentJobId])
                return null;
            return jobRowLookup[state.aligningPageSettings.currentAlignmentJobId];
        }));
        return _this;
    }
    AlignerPageComponent.prototype.ngOnInit = function () {
    };
    AlignerPageComponent.prototype.ngOnDestroy = function () {
    };
    AlignerPageComponent.prototype.onActiveImageChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.SelectDataFile($event.value));
    };
    AlignerPageComponent.prototype.selectImageFiles = function (imageFiles) {
        this.store.dispatch(new workbench_actions_1.UpdateAligningPageSettings({
            alignFormData: __assign(__assign({}, this.alignForm.value), { selectedImageFileIds: imageFiles.map(function (f) { return f.id; }) })
        }));
    };
    AlignerPageComponent.prototype.submit = function (data) {
        this.store.dispatch(new workbench_actions_1.CreateAlignmentJob());
    };
    __decorate([
        core_1.HostBinding('class'),
        core_1.Input('class')
    ], AlignerPageComponent.prototype, "classList");
    AlignerPageComponent = __decorate([
        core_1.Component({
            selector: 'app-aligner-page',
            templateUrl: './aligner-page.component.html',
            styleUrls: ['./aligner-page.component.css']
        })
    ], AlignerPageComponent);
    return AlignerPageComponent;
}(workbench_page_base_component_1.WorkbenchPageBaseComponent));
exports.AlignerPageComponent = AlignerPageComponent;
