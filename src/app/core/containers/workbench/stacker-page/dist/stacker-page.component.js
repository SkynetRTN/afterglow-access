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
exports.StackerPageComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var forms_1 = require("@angular/forms");
var workbench_state_1 = require("../../../workbench.state");
var jobs_state_1 = require("../../../../jobs/jobs.state");
var workbench_actions_1 = require("../../../workbench.actions");
var workbench_page_base_component_1 = require("../workbench-page-base/workbench-page-base.component");
var StackerPageComponent = /** @class */ (function (_super) {
    __extends(StackerPageComponent, _super);
    function StackerPageComponent(store, router) {
        var _this = _super.call(this, store, router) || this;
        _this.classList = 'fx-workbench-outlet';
        _this.stackForm = new forms_1.FormGroup({
            selectedImageFileIds: new forms_1.FormControl([], forms_1.Validators.required),
            mode: new forms_1.FormControl('average', forms_1.Validators.required),
            scaling: new forms_1.FormControl('none', forms_1.Validators.required),
            rejection: new forms_1.FormControl('none', forms_1.Validators.required),
            percentile: new forms_1.FormControl(50),
            low: new forms_1.FormControl(''),
            high: new forms_1.FormControl('')
        });
        _this.stackForm.get('mode').valueChanges.subscribe(function (value) {
            if (value == 'percentile') {
                _this.stackForm.get('percentile').enable();
            }
            else {
                _this.stackForm.get('percentile').disable();
            }
        });
        _this.stackForm.get('rejection').valueChanges.subscribe(function (value) {
            if (['iraf', 'minmax', 'sigclip'].includes(value)) {
                _this.stackForm.get('high').enable();
                _this.stackForm.get('low').enable();
            }
            else {
                _this.stackForm.get('high').disable();
                _this.stackForm.get('low').disable();
            }
        });
        _this.stackFormData$ = store.select(workbench_state_1.WorkbenchState.getState).pipe(operators_1.map(function (state) { return state.stackingPageSettings.stackFormData; }), operators_1.tap(function (data) {
            // console.log("patching values: ", data.selectedImageFileIds)
            _this.stackForm.patchValue(data, { emitEvent: false });
        }));
        _this.stackFormData$.subscribe();
        _this.selectedImageFiles$ = rxjs_1.combineLatest(_this.allImageFiles$, _this.stackFormData$).pipe(operators_1.map(function (_a) {
            var allImageFiles = _a[0], data = _a[1];
            return data.selectedImageFileIds.map(function (id) { return allImageFiles.find(function (f) { return f.id == id; }); });
        }));
        _this.stackJobRow$ = rxjs_1.combineLatest(store.select(workbench_state_1.WorkbenchState.getState), store.select(jobs_state_1.JobsState.getEntities)).pipe(operators_1.map(function (_a) {
            var state = _a[0], jobRowLookup = _a[1];
            if (!state.stackingPageSettings.currentStackingJobId || !jobRowLookup[state.stackingPageSettings.currentStackingJobId])
                return null;
            return jobRowLookup[state.stackingPageSettings.currentStackingJobId];
        }));
        _this.stackForm.valueChanges.subscribe(function (value) {
            // if(this.imageCalcForm.valid) {
            _this.store.dispatch(new workbench_actions_1.UpdateStackingPageSettings({ stackFormData: _this.stackForm.value }));
            // }
        });
        return _this;
    }
    StackerPageComponent.prototype.selectImageFiles = function (imageFiles) {
        this.store.dispatch(new workbench_actions_1.UpdateStackingPageSettings({
            stackFormData: __assign(__assign({}, this.stackForm.value), { selectedImageFileIds: imageFiles.map(function (f) { return f.id; }) })
        }));
    };
    StackerPageComponent.prototype.submit = function (data) {
        this.store.dispatch(new workbench_actions_1.CreateStackingJob());
    };
    StackerPageComponent.prototype.ngOnInit = function () {
    };
    StackerPageComponent.prototype.ngOnDestroy = function () {
    };
    __decorate([
        core_1.HostBinding('class'),
        core_1.Input('class')
    ], StackerPageComponent.prototype, "classList");
    StackerPageComponent = __decorate([
        core_1.Component({
            selector: 'app-stacker-page',
            templateUrl: './stacker-page.component.html',
            styleUrls: ['./stacker-page.component.css']
        })
    ], StackerPageComponent);
    return StackerPageComponent;
}(workbench_page_base_component_1.WorkbenchPageBaseComponent));
exports.StackerPageComponent = StackerPageComponent;
