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
exports.ImageCalculatorPageComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var forms_1 = require("@angular/forms");
var job_types_1 = require("../../../../jobs/models/job-types");
var pixel_ops_jobs_dialog_component_1 = require("../../../components/pixel-ops-jobs-dialog/pixel-ops-jobs-dialog.component");
var workbench_state_1 = require("../../../workbench.state");
var workbench_actions_1 = require("../../../workbench.actions");
var jobs_state_1 = require("../../../../jobs/jobs.state");
var workbench_page_base_component_1 = require("../workbench-page-base/workbench-page-base.component");
var ImageCalculatorPageComponent = /** @class */ (function (_super) {
    __extends(ImageCalculatorPageComponent, _super);
    function ImageCalculatorPageComponent(dialog, store, router) {
        var _this = _super.call(this, store, router) || this;
        _this.dialog = dialog;
        _this.classList = "fx-workbench-outlet";
        _this.operands = [
            { label: 'Add', symbol: '+' },
            { label: 'Subtract', symbol: '-' },
            { label: 'Multiply', symbol: '*' },
            { label: 'Divide', symbol: '/' },
        ];
        _this.modes = [
            { label: 'Scalar', value: 'scalar' },
            { label: 'Image', value: 'image' },
        ];
        _this.divideByZero = function (control) {
            var mode = control.get('mode');
            var scalarValue = control.get('scalarValue');
            var operand = control.get('operand');
            return mode && scalarValue && operand && mode.value == 'scalar' && operand.value == '/' && scalarValue.value == 0 ? { 'divideByZero': true } : null;
        };
        _this.imageCalcForm = new forms_1.FormGroup({
            operand: new forms_1.FormControl('+', forms_1.Validators.required),
            mode: new forms_1.FormControl('image', forms_1.Validators.required),
            imageFileIds: new forms_1.FormControl([], forms_1.Validators.required),
            auxImageFileId: new forms_1.FormControl('', forms_1.Validators.required),
            scalarValue: new forms_1.FormControl({ disabled: true, value: 0 }, forms_1.Validators.required),
            inPlace: new forms_1.FormControl(false, forms_1.Validators.required)
        }, { validators: _this.divideByZero });
        _this.imageCalcFormAdv = new forms_1.FormGroup({
            opString: new forms_1.FormControl('', forms_1.Validators.required),
            imageFileIds: new forms_1.FormControl([], forms_1.Validators.required),
            auxImageFileIds: new forms_1.FormControl([]),
            inPlace: new forms_1.FormControl(false, forms_1.Validators.required)
        });
        _this.pixelOpsFormData$ = store.select(workbench_state_1.WorkbenchState.getState).pipe(operators_1.map(function (state) { return state.pixelOpsPageSettings.pixelOpsFormData; }), operators_1.tap(function (data) {
            _this.imageCalcForm.patchValue(data, { emitEvent: false });
            _this.imageCalcFormAdv.patchValue(data, { emitEvent: false });
        }));
        _this.pixelOpsFormData$.subscribe();
        _this.imageCalcForm.get('mode').valueChanges.subscribe(function (value) {
            if (value == 'scalar') {
                _this.imageCalcForm.get('scalarValue').enable();
                _this.imageCalcForm.get('auxImageFileId').disable();
            }
            else {
                _this.imageCalcForm.get('scalarValue').disable();
                _this.imageCalcForm.get('auxImageFileId').enable();
            }
        });
        _this.imageCalcForm.valueChanges.subscribe(function (value) {
            // if(this.imageCalcForm.valid) {
            _this.store.dispatch(new workbench_actions_1.UpdatePixelOpsPageSettings({ pixelOpsFormData: _this.imageCalcForm.value }));
            _this.store.dispatch(new workbench_actions_1.HideCurrentPixelOpsJobState());
            // }
        });
        _this.imageCalcFormAdv.valueChanges.subscribe(function (value) {
            // if(this.imageCalcFormAdv.valid) {
            _this.store.dispatch(new workbench_actions_1.UpdatePixelOpsPageSettings({ pixelOpsFormData: _this.imageCalcFormAdv.value }));
            _this.store.dispatch(new workbench_actions_1.HideCurrentPixelOpsJobState());
            // }
        });
        var auxImageFiles$ = rxjs_1.combineLatest(_this.pixelOpsFormData$, _this.allImageFiles$).pipe(operators_1.map(function (_a) {
            var data = _a[0], allImageFiles = _a[1];
            return data.auxImageFileIds
                .map(function (id) { return allImageFiles.find(function (f) { return f.id == id; }); })
                .filter(function (f) { return f != null; })
                .sort(function (a, b) { return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0; });
        }));
        var imageFiles$ = rxjs_1.combineLatest(_this.pixelOpsFormData$, _this.allImageFiles$).pipe(operators_1.map(function (_a) {
            var data = _a[0], allImageFiles = _a[1];
            return data.imageFileIds
                .map(function (id) { return allImageFiles.find(function (f) { return f.id == id; }); })
                .filter(function (f) { return f != null; })
                .sort(function (a, b) { return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0; });
        }));
        _this.pixelOpVariables$ = rxjs_1.combineLatest(imageFiles$, auxImageFiles$).pipe(operators_1.map(function (_a) {
            var imageFiles = _a[0], auxImageFiles = _a[1];
            return __spreadArrays([
                { name: 'aux_img', value: auxImageFiles.length == 0 ? 'N/A' : auxImageFiles[0].name },
                { name: 'img', value: 'for each image file' }
            ], imageFiles.sort(function (a, b) { return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0; })
                .map(function (f, index) {
                return {
                    name: "imgs[" + index + "]",
                    value: f.name
                };
            }), auxImageFiles.sort(function (a, b) { return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0; }).map(function (f, index) {
                return {
                    name: "aux_imgs[" + index + "]",
                    value: f.name
                };
            }));
        }));
        _this.pixelOpsJobRows$ = store.select(jobs_state_1.JobsState.getJobs).pipe(operators_1.map(function (allJobRows) { return allJobRows.filter(function (row) { return row.job.type == job_types_1.JobType.PixelOps; }); }));
        _this.currentPixelOpsJobRow$ = rxjs_1.combineLatest(store.select(workbench_state_1.WorkbenchState.getState), _this.pixelOpsJobRows$).pipe(operators_1.filter(function (_a) {
            var state = _a[0], rows = _a[1];
            return (state.pixelOpsPageSettings.currentPixelOpsJobId != null && rows.find(function (r) { return r.job.id == state.pixelOpsPageSettings.currentPixelOpsJobId; }) != undefined);
        }), operators_1.map(function (_a) {
            var state = _a[0], rows = _a[1];
            return rows.find(function (r) { return r.job.id == state.pixelOpsPageSettings.currentPixelOpsJobId; });
        }));
        _this.showCurrentPixelOpsJobState$ = store.select(workbench_state_1.WorkbenchState.getState).pipe(operators_1.map(function (state) { return state.pixelOpsPageSettings.showCurrentPixelOpsJobState; }));
        return _this;
        // this.extractionJobRows$ = combineLatest(
        //   store.select(JobsState.getAllJobs).pipe(
        //     map(
        //       rows =>
        //         rows.filter(row => row.job.type == JobType.Photometry) as Array<{
        //           job: PhotometryJob;
        //           result: PhotometryJobResult;
        //         }>
        //     )
        //   ),
        //   this.activeImageFile$
        // ).pipe(
        //   map(([rows, activeImageFile]) =>
        //     activeImageFile
        //       ? rows
        //           .filter(row =>
        //             row.job.file_ids.includes(parseInt(activeImageFile.id))
        //           )
        //           .sort((a, b) => {
        //             if (a.job.id == b.job.id) return 0;
        //             return a.job.id > b.job.id ? -1 : 1;
        //           })
        //       : []
        //   )
        // );
    }
    ImageCalculatorPageComponent.prototype.ngOnInit = function () {
    };
    ImageCalculatorPageComponent.prototype.ngOnDestroy = function () { };
    ImageCalculatorPageComponent.prototype.submit = function (v) {
        this.store.dispatch(new workbench_actions_1.CreatePixelOpsJob());
    };
    ImageCalculatorPageComponent.prototype.submitAdv = function (v) {
        this.store.dispatch(new workbench_actions_1.CreateAdvPixelOpsJob());
    };
    ImageCalculatorPageComponent.prototype.openPixelOpsJobsDialog = function () {
        var dialogRef = this.dialog.open(pixel_ops_jobs_dialog_component_1.PixelOpsJobsDialogComponent, {
            width: "600px",
            data: { rows$: this.pixelOpsJobRows$, allImageFiles$: this.allImageFiles$ }
        });
        // dialogRef.afterClosed().subscribe(result => {
        //   if (result) {
        //     this.store.dispatch(
        //       new UpdateSourceExtractionSettings({
        //         changes: result
        //       })
        //     );
        //   }
        // });
    };
    ImageCalculatorPageComponent.prototype.onTabChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.HideCurrentPixelOpsJobState());
    };
    __decorate([
        core_1.HostBinding("class"),
        core_1.Input("class")
    ], ImageCalculatorPageComponent.prototype, "classList");
    ImageCalculatorPageComponent = __decorate([
        core_1.Component({
            selector: "app-image-calculator-page",
            templateUrl: "./image-calculator-page.component.html",
            styleUrls: ["./image-calculator-page.component.css"]
        })
    ], ImageCalculatorPageComponent);
    return ImageCalculatorPageComponent;
}(workbench_page_base_component_1.WorkbenchPageBaseComponent));
exports.ImageCalculatorPageComponent = ImageCalculatorPageComponent;
