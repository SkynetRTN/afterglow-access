"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.WorkbenchViewerPanelComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var rxjs_2 = require("rxjs");
var pan_zoom_canvas_component_1 = require("../../../components/pan-zoom-canvas/pan-zoom-canvas.component");
var image_viewer_marker_overlay_component_1 = require("../../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component");
var data_files_state_1 = require("../../../../data-files/data-files.state");
var sources_state_1 = require("../../../sources.state");
var workbench_file_states_state_1 = require("../../../workbench-file-states.state");
var WorkbenchViewerPanelComponent = /** @class */ (function () {
    function WorkbenchViewerPanelComponent(store, sanitization) {
        this.store = store;
        this.sanitization = sanitization;
        this.fileId$ = new rxjs_2.BehaviorSubject(null);
        this.showInfoBar = true;
        this.active = true;
        this.markers = [];
        this.onImageClick = new core_1.EventEmitter();
        this.onImageMove = new core_1.EventEmitter();
        this.onMarkerClick = new core_1.EventEmitter();
        this.imageMouseX = null;
        this.imageMouseY = null;
        this.files$ = this.store.select(data_files_state_1.DataFilesState.getEntities);
        var fileReady$ = rxjs_1.combineLatest(this.fileId$, this.files$).pipe(operators_1.filter(function (_a) {
            var fileId = _a[0], files = _a[1];
            return fileId in files && files[fileId].headerLoaded;
        }));
        this.sources$ = this.store.select(sources_state_1.SourcesState.getSources);
        // this.customMarkers$ = this.store.select(CustomMarkersState.getCustomMarkers);
        // this.selectedCustomMarkers$ = this.store.select(CustomMarkersState.getSelectedCustomMarkers);
        this.imageFileState$ = rxjs_1.combineLatest(this.fileId$, this.store.select(workbench_file_states_state_1.WorkbenchFileStates.getEntities)).pipe(operators_1.map(function (_a) {
            var fileId = _a[0], imageFileStates = _a[1];
            return imageFileStates[fileId];
        }));
    }
    WorkbenchViewerPanelComponent.prototype.ngOnInit = function () { };
    WorkbenchViewerPanelComponent.prototype.ngOnDestroy = function () {
    };
    WorkbenchViewerPanelComponent.prototype.ngOnChanges = function (changes) {
        if (changes.hasOwnProperty("fileId")) {
            this.fileId$.next(changes["fileId"].currentValue);
        }
    };
    WorkbenchViewerPanelComponent.prototype.handleImageMove = function ($event) {
        if ($event.hitImage) {
            this.imageMouseX = $event.imageX;
            this.imageMouseY = $event.imageY;
        }
        else {
            this.imageMouseX = null;
            this.imageMouseY = null;
        }
        this.onImageMove.emit($event);
    };
    WorkbenchViewerPanelComponent.prototype.handleImageClick = function ($event) {
        this.onImageClick.emit($event);
    };
    WorkbenchViewerPanelComponent.prototype.handleMarkerClick = function ($event) {
        this.onMarkerClick.emit($event);
    };
    WorkbenchViewerPanelComponent.prototype.handleDownloadSnapshot = function () {
        var imageCanvas = this.panZoomCanvasComponent.canvas;
        // http://svgopen.org/2010/papers/62-From_SVG_to_Canvas_and_Back/
        var markerSvg = this.imageViewerMarkerOverlayComponent.svg;
        var svgXml = (new XMLSerializer()).serializeToString(markerSvg);
        var data = "data:image/svg+xml;base64," + btoa(svgXml);
        var image = new Image();
        image.onload = function () {
            var canvas = document.createElement("canvas");
            var context = canvas.getContext("2d");
            canvas.width = imageCanvas.width;
            canvas.height = imageCanvas.height;
            context.drawImage(imageCanvas, 0, 0);
            context.drawImage(image, 0, 0);
            var lnk = document.createElement('a'), e;
            /// the key here is to set the download attribute of the a tag
            lnk.download = 'afterglow_screenshot.jpg';
            /// convert canvas content to data-uri for link. When download
            /// attribute is set the content pointed to by link will be
            /// pushed as "download" in HTML5 capable browsers
            lnk.href = canvas.toDataURL("image/jpg;base64");
            /// create a "fake" click-event to trigger the download
            if (document.createEvent) {
                e = document.createEvent("MouseEvents");
                e.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                lnk.dispatchEvent(e);
            }
        };
        image.src = data;
    };
    __decorate([
        core_1.Input()
    ], WorkbenchViewerPanelComponent.prototype, "fileId");
    __decorate([
        core_1.Input()
    ], WorkbenchViewerPanelComponent.prototype, "showInfoBar");
    __decorate([
        core_1.Input()
    ], WorkbenchViewerPanelComponent.prototype, "active");
    __decorate([
        core_1.Input()
    ], WorkbenchViewerPanelComponent.prototype, "markers");
    __decorate([
        core_1.Output()
    ], WorkbenchViewerPanelComponent.prototype, "onImageClick");
    __decorate([
        core_1.Output()
    ], WorkbenchViewerPanelComponent.prototype, "onImageMove");
    __decorate([
        core_1.Output()
    ], WorkbenchViewerPanelComponent.prototype, "onMarkerClick");
    __decorate([
        core_1.ViewChild(pan_zoom_canvas_component_1.PanZoomCanvasComponent, { static: true })
    ], WorkbenchViewerPanelComponent.prototype, "panZoomCanvasComponent");
    __decorate([
        core_1.ViewChild(image_viewer_marker_overlay_component_1.ImageViewerMarkerOverlayComponent, { static: false })
    ], WorkbenchViewerPanelComponent.prototype, "imageViewerMarkerOverlayComponent");
    WorkbenchViewerPanelComponent = __decorate([
        core_1.Component({
            selector: "app-workbench-viewer-panel",
            templateUrl: "./workbench-viewer-panel.component.html",
            styleUrls: ["./workbench-viewer-panel.component.scss"]
        })
    ], WorkbenchViewerPanelComponent);
    return WorkbenchViewerPanelComponent;
}());
exports.WorkbenchViewerPanelComponent = WorkbenchViewerPanelComponent;
