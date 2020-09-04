"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.ImageViewerTitleBarComponent = void 0;
var core_1 = require("@angular/core");
var data_file_1 = require("../../../data-files/models/data-file");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var data_files_actions_1 = require("../../../data-files/data-files.actions");
var workbench_file_states_actions_1 = require("../../workbench-file-states.actions");
var confirmation_dialog_component_1 = require("../confirmation-dialog/confirmation-dialog.component");
var ImageViewerTitleBarComponent = /** @class */ (function () {
    function ImageViewerTitleBarComponent(store, dialog) {
        this.store = store;
        this.dialog = dialog;
        this.downloadSnapshot = new core_1.EventEmitter();
        this.zoomStepFactor = 0.75;
        this.startZoomIn$ = new rxjs_1.Subject();
        this.stopZoomIn$ = new rxjs_1.Subject();
        this.startZoomOut$ = new rxjs_1.Subject();
        this.stopZoomOut$ = new rxjs_1.Subject();
    }
    ImageViewerTitleBarComponent.prototype.ngOnInit = function () {
    };
    ImageViewerTitleBarComponent.prototype.onDownloadSnapshotClick = function () {
        this.downloadSnapshot.emit();
    };
    ImageViewerTitleBarComponent.prototype.removeFromLibrary = function () {
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
    ImageViewerTitleBarComponent.prototype.startZoomIn = function () {
        var _this = this;
        rxjs_1.timer(0, 125).pipe(operators_1.takeUntil(this.stopZoomIn$)).subscribe(function (t) {
            _this.zoomIn();
        });
    };
    ImageViewerTitleBarComponent.prototype.stopZoomIn = function () {
        this.stopZoomIn$.next(true);
    };
    ImageViewerTitleBarComponent.prototype.startZoomOut = function () {
        var _this = this;
        rxjs_1.timer(0, 125).pipe(operators_1.takeUntil(this.stopZoomOut$)).subscribe(function (t) {
            _this.zoomOut();
        });
    };
    ImageViewerTitleBarComponent.prototype.stopZoomOut = function () {
        this.stopZoomOut$.next(true);
    };
    ImageViewerTitleBarComponent.prototype.zoomIn = function (imageAnchor) {
        if (imageAnchor === void 0) { imageAnchor = null; }
        this.zoomBy(1.0 / this.zoomStepFactor, imageAnchor);
    };
    ImageViewerTitleBarComponent.prototype.zoomOut = function (imageAnchor) {
        if (imageAnchor === void 0) { imageAnchor = null; }
        this.zoomBy(this.zoomStepFactor, imageAnchor);
    };
    ImageViewerTitleBarComponent.prototype.zoomTo = function (value) {
        this.store.dispatch(new workbench_file_states_actions_1.ZoomTo(this.imageFile.id, value, null));
    };
    ImageViewerTitleBarComponent.prototype.zoomBy = function (factor, imageAnchor) {
        if (imageAnchor === void 0) { imageAnchor = null; }
        this.store.dispatch(new workbench_file_states_actions_1.ZoomBy(this.imageFile.id, factor, imageAnchor));
    };
    ImageViewerTitleBarComponent.prototype.zoomToFit = function (padding) {
        if (padding === void 0) { padding = 0; }
        this.store.dispatch(new workbench_file_states_actions_1.CenterRegionInViewport(this.imageFile.id, { x: 1, y: 1, width: data_file_1.getWidth(this.imageFile), height: data_file_1.getHeight(this.imageFile) }));
    };
    __decorate([
        core_1.Input()
    ], ImageViewerTitleBarComponent.prototype, "imageFile");
    __decorate([
        core_1.Output()
    ], ImageViewerTitleBarComponent.prototype, "downloadSnapshot");
    ImageViewerTitleBarComponent = __decorate([
        core_1.Component({
            selector: 'app-image-viewer-title-bar',
            templateUrl: './image-viewer-title-bar.component.html',
            styleUrls: ['./image-viewer-title-bar.component.scss']
        })
    ], ImageViewerTitleBarComponent);
    return ImageViewerTitleBarComponent;
}());
exports.ImageViewerTitleBarComponent = ImageViewerTitleBarComponent;
