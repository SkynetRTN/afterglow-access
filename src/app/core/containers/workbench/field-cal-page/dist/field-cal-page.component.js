"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.FieldCalPageComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var forms_1 = require("@angular/forms");
var create_field_cal_dialog_component_1 = require("../../../components/create-field-cal-dialog/create-field-cal-dialog.component");
var collections_1 = require("@angular/cdk/collections");
var job_types_1 = require("../../../../jobs/models/job-types");
var workbench_state_1 = require("../../../workbench.state");
var workbench_actions_1 = require("../../../workbench.actions");
// import { DataFile, ImageFile } from '../../../models'
// import { DataFileLibraryStore } from '../../../stores/data-file-library.store'
// import { ImageViewerComponent } from '../../../components/image-viewer/image-viewer.component'
var FieldCalPageComponent = /** @class */ (function () {
    function FieldCalPageComponent(store, dialog, router) {
        var _this = this;
        this.store = store;
        this.dialog = dialog;
        this.classList = 'fx-workbench-outlet';
        this.enableMagLimit = false;
        this.magLimitFilter = null;
        this.magLimitValue = 12;
        this.selectionModel = new collections_1.SelectionModel(true, []);
        this.catalogForm = new forms_1.FormGroup({
            catalog: new forms_1.FormControl('', forms_1.Validators.required),
            enableMagLimit: new forms_1.FormControl(false, forms_1.Validators.required),
            magLimitFilter: new forms_1.FormControl({ disabled: true, value: '' }, forms_1.Validators.required),
            magMaxLimitValue: new forms_1.FormControl({ disabled: true, value: 16 }, forms_1.Validators.required),
            magMinLimitValue: new forms_1.FormControl({ disabled: true, value: 10 }, forms_1.Validators.required)
        });
        this.fullScreenPanel$ = this.store.select(workbench_state_1.WorkbenchState.getFullScreenPanel);
        this.inFullScreenMode$ = this.store.select(workbench_state_1.WorkbenchState.getInFullScreenMode);
        this.activeImageFile$ = store.select(workbench_state_1.WorkbenchState.getActiveImageFile);
        this.activeImageHasWcs$ = this.activeImageFile$.pipe(operators_1.map(function (imageFile) { return imageFile != null && imageFile.wcs.isValid(); }));
        this.activeImageFileState$ = store.select(workbench_state_1.WorkbenchState.getActiveImageFileState);
        this.showConfig$ = store.select(workbench_state_1.WorkbenchState.getShowConfig);
        this.catalogs$ = store.select(workbench_state_1.WorkbenchState.getState).pipe(operators_1.map(function (state) { return state.catalogs; }));
        this.fieldCals$ = store.select(workbench_state_1.WorkbenchState.getState).pipe(operators_1.map(function (state) { return state.fieldCals; }));
        this.selectedFieldCalId$ = store.select(workbench_state_1.WorkbenchState.getState).pipe(operators_1.map(function (state) { return state.selectedFieldCalId; }));
        this.selectedFieldCal$ = rxjs_1.combineLatest(this.fieldCals$, this.selectedFieldCalId$).pipe(operators_1.map(function (_a) {
            var fieldCals = _a[0], selectedFieldCalId = _a[1];
            if (!fieldCals || selectedFieldCalId == null)
                return null;
            var selectedFieldCal = fieldCals.find(function (fieldCal) { return fieldCal.id == selectedFieldCalId; });
            if (!selectedFieldCal)
                return null;
            return selectedFieldCal;
        }));
        this.selectedCatalogId$ = store.select(workbench_state_1.WorkbenchState.getState).pipe(operators_1.map(function (state) { return state.selectedCatalogId; }));
        this.selectedCatalog$ = rxjs_1.combineLatest(this.catalogs$, this.selectedCatalogId$).pipe(operators_1.map(function (_a) {
            var catalogs = _a[0], selectedCatalogId = _a[1];
            if (!catalogs || selectedCatalogId == null)
                return null;
            var selectedCatalog = catalogs.find(function (catalog) { return catalog.name == selectedCatalogId; });
            if (!selectedCatalog)
                return null;
            return selectedCatalog;
        }));
        this.catalogForm.get('enableMagLimit').valueChanges.subscribe(function (value) {
            if (value) {
                _this.catalogForm.get('magLimitFilter').enable();
                _this.catalogForm.get('magMaxLimitValue').enable();
                _this.catalogForm.get('magMinLimitValue').enable();
            }
            else {
                _this.catalogForm.get('magLimitFilter').disable();
                _this.catalogForm.get('magMaxLimitValue').disable();
                _this.catalogForm.get('magMinLimitValue').disable();
            }
        });
    }
    FieldCalPageComponent.prototype.ngOnInit = function () {
    };
    FieldCalPageComponent.prototype.ngOnDestroy = function () {
    };
    FieldCalPageComponent.prototype.ngAfterViewInit = function () { };
    FieldCalPageComponent.prototype.isAllSelected = function () {
        return false;
        // const numSelected = this.selectionModel.selected.length;
        // const numRows = this.dataSource.sources.length;
        // return numSelected === numRows;
    };
    FieldCalPageComponent.prototype.showSelectAll = function () {
        return false;
        // return this.dataSource.sources && this.dataSource.sources.length != 0;
    };
    FieldCalPageComponent.prototype.onFieldCalChange = function (value) {
        this.store.dispatch(new workbench_actions_1.SetSelectedFieldCal(value));
    };
    FieldCalPageComponent.prototype.onCatalogChange = function (value) {
        this.store.dispatch(new workbench_actions_1.SetSelectedCatalog(value));
    };
    FieldCalPageComponent.prototype.onMagLimitFilterChange = function (filter) {
        this.magLimitFilter = filter;
    };
    FieldCalPageComponent.prototype.addSourcesFromCatalog = function (fieldCalId, selectedImageFiles, catalogFormValue) {
        var constraints = {};
        if (catalogFormValue.enableMagLimit) {
            constraints[catalogFormValue.magLimitFilter + "mag"] = catalogFormValue.magMinLimitValue + ".." + catalogFormValue.magMaxLimitValue;
        }
        var catalogQueryJob = {
            id: null,
            type: job_types_1.JobType.CatalogQuery,
            file_ids: selectedImageFiles.map(function (f) { return parseInt(f.id); }),
            catalogs: [catalogFormValue.catalog],
            constraints: constraints
        };
        this.store.dispatch(new workbench_actions_1.AddFieldCalSourcesFromCatalog(fieldCalId, catalogQueryJob));
    };
    FieldCalPageComponent.prototype.openCreateFieldCalDialog = function () {
        var _this = this;
        var dialogRef = this.dialog.open(create_field_cal_dialog_component_1.CreateFieldCalDialogComponent, {
            width: "400px",
            data: {}
        });
        dialogRef.afterClosed().subscribe(function (result) {
            if (result) {
                _this.store.dispatch(new workbench_actions_1.CreateFieldCal({
                    id: null,
                    name: result.name,
                    catalogSources: [],
                    customFilterLookup: {},
                    sourceInclusionPercent: 0,
                    sourceMatchTol: 5.0,
                    minSnr: 3.0,
                    maxSnr: 0
                }));
            }
        });
    };
    FieldCalPageComponent.prototype.onMarkerClick = function ($event) {
        if ($event.mouseEvent.altKey)
            return;
        // let source = this.dataSource.sources.find(
        //   source => $event.marker.data && source.id == $event.marker.data["id"]
        // );
        // if (!source) return;
        // let sourceSelected = this.selectedSources.includes(source);
        // // if(!sourceSelected) {
        // //   // select the source
        // //   this.selectSources($event.targetFile, [source]);
        // // }
        // // else {
        // //   // deselect the source
        // //   this.deselectSources($event.targetFile, [source]);
        // // }
        // if ($event.mouseEvent.ctrlKey) {
        //   if (!sourceSelected) {
        //     // select the source
        //     this.selectSources([source]);
        //   } else {
        //     // deselect the source
        //     this.deselectSources([source]);
        //   }
        // } else {
        //   this.store.dispatch(
        //     new sourceActions.SetSourceSelection({ sources: [source] })
        //   );
        // }
        // $event.mouseEvent.stopImmediatePropagation();
        // $event.mouseEvent.preventDefault();
    };
    FieldCalPageComponent.prototype.onImageClick = function ($event) {
        if ($event.hitImage) {
            // if (
            //   this.workbenchState.sourceExtractorModeOption ==
            //     SourceExtractorModeOption.MOUSE &&
            //   (this.selectedSources.length == 0 || $event.mouseEvent.altKey)
            // ) {
            //   let primaryCoord = $event.imageX;
            //   let secondaryCoord = $event.imageY;
            //   let posType = PosType.PIXEL;
            //   let centroidClicks = true;
            //   if (centroidClicks) {
            //     let result = centroidPsf(
            //       this.activeImageFile,
            //       primaryCoord,
            //       secondaryCoord,
            //       this.workbenchState.centroidSettings.psfCentroiderSettings
            //     );
            //     primaryCoord = result.x;
            //     secondaryCoord = result.y;
            //   }
            //   if (getHasWcs(this.activeImageFile)) {
            //     let wcs = getWcs(this.activeImageFile);
            //     let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
            //     primaryCoord = raDec[0];
            //     secondaryCoord = raDec[1];
            //     posType = PosType.SKY;
            //   }
            //   let source: Source = {
            //     id: null,
            //     label: "",
            //     objectId: null,
            //     fileId: this.activeImageFile.id,
            //     primaryCoord: primaryCoord,
            //     secondaryCoord: secondaryCoord,
            //     posType: posType,
            //     pm: null,
            //     pmPosAngle: null,
            //     pmEpoch: getCenterTime(this.activeImageFile)
            //   };
            //   this.store.dispatch(
            //     new sourceActions.AddSources({ sources: [source] })
            //   );
            // } else {
            //   this.store.dispatch(
            //     new sourceActions.SetSourceSelection({ sources: [] })
            //   );
            // }
        }
    };
    __decorate([
        core_1.HostBinding('class'),
        core_1.Input('class')
    ], FieldCalPageComponent.prototype, "classList");
    FieldCalPageComponent = __decorate([
        core_1.Component({
            selector: "app-field-cal-page",
            templateUrl: "./field-cal-page.component.html",
            styleUrls: ["./field-cal-page.component.scss"]
            //changeDetection: ChangeDetectionStrategy.OnPush
        })
    ], FieldCalPageComponent);
    return FieldCalPageComponent;
}());
exports.FieldCalPageComponent = FieldCalPageComponent;
