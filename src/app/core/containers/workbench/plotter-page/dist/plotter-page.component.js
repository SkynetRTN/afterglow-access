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
exports.__esModule = true;
exports.PlotterPageComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var data_file_1 = require("../../../../data-files/models/data-file");
var workbench_state_1 = require("../../../models/workbench-state");
var centroider_1 = require("../../../models/centroider");
var source_1 = require("../../../models/source");
var workbench_state_2 = require("../../../workbench.state");
var workbench_actions_1 = require("../../../workbench.actions");
var workbench_file_states_actions_1 = require("../../../workbench-file-states.actions");
var workbench_file_states_state_1 = require("../../../workbench-file-states.state");
var data_files_state_1 = require("../../../../data-files/data-files.state");
var workbench_page_base_component_1 = require("../workbench-page-base/workbench-page-base.component");
var marker_1 = require("../../../models/marker");
var PlotterPageComponent = /** @class */ (function (_super) {
    __extends(PlotterPageComponent, _super);
    function PlotterPageComponent(actions$, store, router) {
        var _this = _super.call(this, store, router) || this;
        _this.actions$ = actions$;
        _this.PosType = source_1.PosType;
        _this.classList = 'fx-workbench-outlet';
        _this.plotterFileState$ = _this.activeImageFileState$.pipe(operators_1.filter(function (state) { return state != null; }), operators_1.map(function (state) { return state.plotter; }));
        _this.plotterPageSettings$ = store.select(workbench_state_2.WorkbenchState.getPlotterPageSettings);
        _this.plotterSyncEnabled$ = _this.plotterPageSettings$.pipe(operators_1.map(function (settings) { return settings.plotterSyncEnabled; }));
        _this.mode$ = _this.plotterPageSettings$.pipe(operators_1.map(function (settings) { return settings.plotterMode; }));
        _this.lineStart$ = rxjs_1.combineLatest(_this.plotterFileState$, _this.activeImageFile$).pipe(operators_1.map(function (_a) {
            var state = _a[0], activeImageFile = _a[1];
            return state.lineMeasureStart;
        }), operators_1.withLatestFrom(_this.activeImageFile$), operators_1.map(function (_a) {
            var line = _a[0], imageFile = _a[1];
            if (!line)
                return null;
            return _this.normalizeLine(imageFile, line);
        }));
        _this.lineEnd$ = rxjs_1.combineLatest(_this.plotterFileState$, _this.activeImageFile$).pipe(operators_1.map(function (_a) {
            var state = _a[0], activeImageFile = _a[1];
            return state.lineMeasureEnd;
        }), operators_1.withLatestFrom(_this.activeImageFile$), operators_1.map(function (_a) {
            var line = _a[0], imageFile = _a[1];
            if (!line)
                return null;
            return _this.normalizeLine(imageFile, line);
        }));
        _this.vectorInfo$ = rxjs_1.combineLatest(_this.lineStart$, _this.lineEnd$, _this.activeImageFileLoaded$).pipe(operators_1.map(function (_a) {
            var lineStart = _a[0], lineEnd = _a[1], imageFile = _a[2];
            var pixelSeparation = null;
            var skySeparation = null;
            var pixelPosAngle = null;
            var skyPosAngle = null;
            if (!lineStart || !lineEnd)
                return;
            if (lineStart.x !== null &&
                lineStart.y !== null &&
                lineEnd.x !== null &&
                lineEnd.y !== null) {
                var deltaX = lineEnd.x - lineStart.x;
                var deltaY = lineEnd.y - lineStart.y;
                pixelPosAngle = (Math.atan2(deltaY, -deltaX) * 180.0) / Math.PI - 90;
                pixelPosAngle = pixelPosAngle % 360;
                if (pixelPosAngle < 0)
                    pixelPosAngle += 360;
                pixelSeparation = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
                if (data_file_1.getDegsPerPixel(imageFile) != undefined) {
                    skySeparation = pixelSeparation * data_file_1.getDegsPerPixel(imageFile) * 3600;
                }
            }
            if (lineStart.raHours !== null &&
                lineStart.decDegs !== null &&
                lineEnd.raHours !== null &&
                lineEnd.decDegs !== null) {
                var centerDec = (lineStart.decDegs + lineEnd.decDegs) / 2;
                var deltaRa = (lineEnd.raHours - lineStart.raHours) *
                    15 *
                    3600 *
                    Math.cos((centerDec * Math.PI) / 180);
                var deltaDec = (lineEnd.decDegs - lineStart.decDegs) * 3600;
                skyPosAngle = (Math.atan2(deltaDec, -deltaRa) * 180.0) / Math.PI - 90;
                skyPosAngle = skyPosAngle % 360;
                if (skyPosAngle < 0)
                    skyPosAngle += 360;
                skySeparation = Math.sqrt(Math.pow(deltaRa, 2) + Math.pow(deltaDec, 2));
            }
            return {
                pixelSeparation: pixelSeparation,
                skySeparation: skySeparation,
                pixelPosAngle: pixelPosAngle,
                skyPosAngle: skyPosAngle
            };
        }));
        _this.markerUpdater = rxjs_1.combineLatest(_this.viewerFileIds$, _this.viewerImageFileHeaders$, _this.store.select(workbench_state_2.WorkbenchState.getPlotterPageSettings), _this.store.select(workbench_file_states_state_1.WorkbenchFileStates.getEntities)).pipe(operators_1.withLatestFrom(_this.store.select(workbench_state_2.WorkbenchState.getViewers), _this.store.select(data_files_state_1.DataFilesState.getEntities), _this.store.select(workbench_state_2.WorkbenchState.getActiveTool), _this.store.select(workbench_state_2.WorkbenchState.getActiveTool))).subscribe(function (_a) {
            var _b = _a[0], fileIds = _b[0], imageFiles = _b[1], plotterPageSettings = _b[2], imageFileStates = _b[3], viewers = _a[1], dataFiles = _a[2], activeTool = _a[3];
            if (activeTool != workbench_state_1.WorkbenchTool.PLOTTER)
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
                var plotter = imageFileStates[fileId].plotter;
                var lineMeasureStart = plotter.lineMeasureStart;
                var lineMeasureEnd = plotter.lineMeasureEnd;
                if (!lineMeasureStart || !lineMeasureEnd) {
                    _this.store.dispatch(new workbench_actions_1.SetViewerMarkers(viewer.viewerId, []));
                    return;
                }
                if (!file) {
                    _this.store.dispatch(new workbench_actions_1.SetViewerMarkers(viewer.viewerId, []));
                }
                var startPrimaryCoord = lineMeasureStart.primaryCoord;
                var startSecondaryCoord = lineMeasureStart.secondaryCoord;
                var startPosType = lineMeasureStart.posType;
                var endPrimaryCoord = lineMeasureEnd.primaryCoord;
                var endSecondaryCoord = lineMeasureEnd.secondaryCoord;
                var endPosType = lineMeasureEnd.posType;
                var x1 = startPrimaryCoord;
                var y1 = startSecondaryCoord;
                var x2 = endPrimaryCoord;
                var y2 = endSecondaryCoord;
                if (startPosType == source_1.PosType.SKY || endPosType == source_1.PosType.SKY) {
                    if (!file.headerLoaded || !file.wcs.isValid()) {
                        _this.store.dispatch(new workbench_actions_1.SetViewerMarkers(viewer.viewerId, []));
                        return;
                    }
                    var wcs = file.wcs;
                    if (startPosType == source_1.PosType.SKY) {
                        var xy = wcs.worldToPix([startPrimaryCoord, startSecondaryCoord]);
                        x1 = Math.max(Math.min(xy[0], data_file_1.getWidth(file)), 0);
                        y1 = Math.max(Math.min(xy[1], data_file_1.getHeight(file)), 0);
                    }
                    if (endPosType == source_1.PosType.SKY) {
                        var xy = wcs.worldToPix([endPrimaryCoord, endSecondaryCoord]);
                        x2 = Math.max(Math.min(xy[0], data_file_1.getWidth(file)), 0);
                        y2 = Math.max(Math.min(xy[1], data_file_1.getHeight(file)), 0);
                    }
                }
                var markers = [];
                if (plotterPageSettings.plotterMode == '1D') {
                    markers = [
                        {
                            type: marker_1.MarkerType.LINE,
                            x1: x1,
                            y1: y1,
                            x2: x2,
                            y2: y2
                        }
                    ];
                }
                else {
                    markers = [
                        {
                            type: marker_1.MarkerType.RECTANGLE,
                            x: Math.min(x1, x2),
                            y: Math.min(y1, y2),
                            width: Math.abs(x2 - x1),
                            height: Math.abs(y2 - y1)
                        }
                    ];
                }
                _this.store.dispatch(new workbench_actions_1.SetViewerMarkers(viewer.viewerId, markers));
            });
        });
        return _this;
    }
    PlotterPageComponent.prototype.normalizeLine = function (imageFile, line) {
        if (!imageFile.headerLoaded)
            return;
        var x = null;
        var y = null;
        var raHours = null;
        var decDegs = null;
        if (line.posType == source_1.PosType.PIXEL) {
            x = line.primaryCoord;
            y = line.secondaryCoord;
            if (imageFile.wcs.isValid()) {
                var wcs = imageFile.wcs;
                var raDec = wcs.pixToWorld([line.primaryCoord, line.secondaryCoord]);
                raHours = raDec[0];
                decDegs = raDec[1];
            }
        }
        else {
            raHours = line.primaryCoord;
            decDegs = line.secondaryCoord;
            if (imageFile.wcs.isValid()) {
                var wcs = imageFile.wcs;
                var xy = wcs.worldToPix([line.primaryCoord, line.secondaryCoord]);
                x = xy[0];
                y = xy[1];
            }
        }
        return { x: x, y: y, raHours: raHours, decDegs: decDegs };
    };
    PlotterPageComponent.prototype.ngOnInit = function () {
    };
    PlotterPageComponent.prototype.ngAfterViewInit = function () { };
    PlotterPageComponent.prototype.ngOnChanges = function () { };
    PlotterPageComponent.prototype.ngOnDestroy = function () {
        this.store.dispatch(new workbench_actions_1.ClearViewerMarkers());
        this.markerUpdater.unsubscribe();
    };
    PlotterPageComponent.prototype.onModeChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdatePlotterPageSettings({ plotterMode: $event }));
    };
    PlotterPageComponent.prototype.onPlotterSyncEnabledChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdatePlotterPageSettings({ plotterSyncEnabled: $event.checked }));
    };
    PlotterPageComponent.prototype.onImageMove = function ($event) {
        var imageFile = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities)[$event.targetFile.id];
        var measuring = this.store.selectSnapshot(workbench_file_states_state_1.WorkbenchFileStates.getEntities)[$event.targetFile.id].plotter.measuring;
        if (measuring) {
            var primaryCoord = $event.imageX;
            var secondaryCoord = $event.imageY;
            var posType = source_1.PosType.PIXEL;
            if (imageFile.wcs.isValid()) {
                var wcs = imageFile.wcs;
                var raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
                primaryCoord = raDec[0];
                secondaryCoord = raDec[1];
                posType = source_1.PosType.SKY;
            }
            this.store.dispatch(new workbench_file_states_actions_1.UpdateLine($event.targetFile.id, {
                primaryCoord: primaryCoord,
                secondaryCoord: secondaryCoord,
                posType: posType
            }));
        }
    };
    PlotterPageComponent.prototype.onMarkerClick = function ($event) {
    };
    PlotterPageComponent.prototype.onImageClick = function ($event) {
        var imageFile = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities)[$event.targetFile.id];
        var plotterPageSettings = this.store.selectSnapshot(workbench_state_2.WorkbenchState.getPlotterPageSettings);
        if ($event.hitImage && imageFile) {
            var x = $event.imageX;
            var y = $event.imageY;
            if (plotterPageSettings &&
                plotterPageSettings.centroidClicks) {
                var result = void 0;
                if (plotterPageSettings.planetCentroiding) {
                    result = centroider_1.centroidDisk(imageFile, x, y);
                }
                else {
                    result = centroider_1.centroidPsf(imageFile, x, y);
                }
                x = result.x;
                y = result.y;
            }
            var primaryCoord = x;
            var secondaryCoord = y;
            var posType = source_1.PosType.PIXEL;
            if (imageFile.wcs.isValid()) {
                var wcs = imageFile.wcs;
                var raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
                primaryCoord = raDec[0];
                secondaryCoord = raDec[1];
                posType = source_1.PosType.SKY;
            }
            this.store.dispatch(new workbench_file_states_actions_1.StartLine($event.targetFile.id, {
                primaryCoord: primaryCoord,
                secondaryCoord: secondaryCoord,
                posType: posType
            }));
        }
    };
    PlotterPageComponent.prototype.onCentroidClicksChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdatePlotterPageSettings({ centroidClicks: $event.checked }));
    };
    PlotterPageComponent.prototype.onPlanetCentroidingChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdatePlotterPageSettings({ planetCentroiding: $event.checked }));
    };
    PlotterPageComponent.prototype.onInterpolatePixelsChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdatePlotterPageSettings({ interpolatePixels: $event.checked }));
    };
    __decorate([
        core_1.HostBinding('class'),
        core_1.Input('class')
    ], PlotterPageComponent.prototype, "classList");
    __decorate([
        core_1.ViewChild("plotter", { static: false })
    ], PlotterPageComponent.prototype, "plotter");
    PlotterPageComponent = __decorate([
        core_1.Component({
            selector: "app-plotter-page",
            templateUrl: "./plotter-page.component.html",
            styleUrls: ["./plotter-page.component.css"],
            changeDetection: core_1.ChangeDetectionStrategy.OnPush
        })
    ], PlotterPageComponent);
    return PlotterPageComponent;
}(workbench_page_base_component_1.WorkbenchPageBaseComponent));
exports.PlotterPageComponent = PlotterPageComponent;
