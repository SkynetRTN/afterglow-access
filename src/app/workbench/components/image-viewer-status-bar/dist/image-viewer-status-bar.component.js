"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.ImageViewerStatusBarComponent = void 0;
var core_1 = require("@angular/core");
var data_file_1 = require("../../../data-files/models/data-file");
var rxjs_1 = require("rxjs");
var confirmation_dialog_component_1 = require("../confirmation-dialog/confirmation-dialog.component");
var data_files_actions_1 = require("../../../data-files/data-files.actions");
var operators_1 = require("rxjs/operators");
var workbench_file_states_actions_1 = require("../../workbench-file-states.actions");
var ImageViewerStatusBarComponent = /** @class */ (function () {
    function ImageViewerStatusBarComponent(store, dialog) {
        this.store = store;
        this.dialog = dialog;
        this.downloadSnapshot = new core_1.EventEmitter();
        this.zoomStepFactor = 0.75;
        this.startZoomIn$ = new rxjs_1.Subject();
        this.stopZoomIn$ = new rxjs_1.Subject();
        this.startZoomOut$ = new rxjs_1.Subject();
        this.stopZoomOut$ = new rxjs_1.Subject();
    }
    ImageViewerStatusBarComponent.prototype.ngOnInit = function () {
    };
    ImageViewerStatusBarComponent.prototype.ngOnChanges = function () {
        if (this.imageMouseX == null || this.imageMouseY == null || !this.imageFile) {
            this.pixelValue = null;
            this.raHours = null;
            this.decDegs = null;
            return;
        }
        if (this.imageFile.headerLoaded) {
            this.pixelValue = data_file_1.getPixel(this.imageFile, this.imageMouseX, this.imageMouseY);
            if (this.imageFile.wcs.isValid()) {
                var wcs = this.imageFile.wcs;
                var raDec = wcs.pixToWorld([this.imageMouseX, this.imageMouseY]);
                this.raHours = raDec[0];
                this.decDegs = raDec[1];
            }
            else {
                this.raHours = null;
                this.decDegs = null;
            }
        }
    };
    ImageViewerStatusBarComponent.prototype.onDownloadSnapshotClick = function () {
        this.downloadSnapshot.emit();
    };
    ImageViewerStatusBarComponent.prototype.removeFromLibrary = function () {
        var _this = this;
        if (!this.imageFile)
            return;
        var imageFileId = this.imageFile.id;
        var dialogRef = this.dialog.open(confirmation_dialog_component_1.ConfirmationDialogComponent, {
            width: "300px",
            data: {
                message: "Are you sure you want to delete this file from your library?",
                confirmationBtn: {
                    color: 'warn',
                    label: 'Delete File'
                }
            }
        });
        dialogRef.afterClosed().subscribe(function (result) {
            if (result) {
                _this.store.dispatch(new data_files_actions_1.RemoveDataFile(imageFileId));
            }
        });
    };
    ImageViewerStatusBarComponent.prototype.startZoomIn = function () {
        var _this = this;
        rxjs_1.timer(0, 125).pipe(operators_1.takeUntil(this.stopZoomIn$)).subscribe(function (t) {
            _this.zoomIn();
        });
    };
    ImageViewerStatusBarComponent.prototype.stopZoomIn = function () {
        this.stopZoomIn$.next(true);
    };
    ImageViewerStatusBarComponent.prototype.startZoomOut = function () {
        var _this = this;
        rxjs_1.timer(0, 125).pipe(operators_1.takeUntil(this.stopZoomOut$)).subscribe(function (t) {
            _this.zoomOut();
        });
    };
    ImageViewerStatusBarComponent.prototype.stopZoomOut = function () {
        this.stopZoomOut$.next(true);
    };
    ImageViewerStatusBarComponent.prototype.zoomIn = function (imageAnchor) {
        if (imageAnchor === void 0) { imageAnchor = null; }
        this.zoomBy(1.0 / this.zoomStepFactor, imageAnchor);
    };
    ImageViewerStatusBarComponent.prototype.zoomOut = function (imageAnchor) {
        if (imageAnchor === void 0) { imageAnchor = null; }
        this.zoomBy(this.zoomStepFactor, imageAnchor);
    };
    ImageViewerStatusBarComponent.prototype.zoomTo = function (value) {
        this.store.dispatch(new workbench_file_states_actions_1.ZoomTo(this.imageFile.id, value, null));
    };
    ImageViewerStatusBarComponent.prototype.zoomBy = function (factor, imageAnchor) {
        if (imageAnchor === void 0) { imageAnchor = null; }
        this.store.dispatch(new workbench_file_states_actions_1.ZoomBy(this.imageFile.id, factor, imageAnchor));
    };
    ImageViewerStatusBarComponent.prototype.zoomToFit = function (padding) {
        if (padding === void 0) { padding = 0; }
        this.store.dispatch(new workbench_file_states_actions_1.CenterRegionInViewport(this.imageFile.id, { x: 1, y: 1, width: data_file_1.getWidth(this.imageFile), height: data_file_1.getHeight(this.imageFile) }));
    };
    __decorate([
        core_1.Input()
    ], ImageViewerStatusBarComponent.prototype, "imageFile");
    __decorate([
        core_1.Input()
    ], ImageViewerStatusBarComponent.prototype, "imageMouseX");
    __decorate([
        core_1.Input()
    ], ImageViewerStatusBarComponent.prototype, "imageMouseY");
    __decorate([
        core_1.Output()
    ], ImageViewerStatusBarComponent.prototype, "downloadSnapshot");
    ImageViewerStatusBarComponent = __decorate([
        core_1.Component({
            selector: 'app-image-viewer-status-bar',
            templateUrl: './image-viewer-status-bar.component.html',
            styleUrls: ['./image-viewer-status-bar.component.css']
        })
    ], ImageViewerStatusBarComponent);
    return ImageViewerStatusBarComponent;
}());
exports.ImageViewerStatusBarComponent = ImageViewerStatusBarComponent;
