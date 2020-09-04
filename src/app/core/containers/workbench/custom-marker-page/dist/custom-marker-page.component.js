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
exports.CustomMarkerPageComponent = void 0;
var core_1 = require("@angular/core");
var marker_1 = require("../../../models/marker");
var workbench_actions_1 = require("../../../workbench.actions");
var workbench_page_base_component_1 = require("../workbench-page-base/workbench-page-base.component");
var CustomMarkerPageComponent = /** @class */ (function (_super) {
    __extends(CustomMarkerPageComponent, _super);
    function CustomMarkerPageComponent(actions$, store, router) {
        var _this = _super.call(this, store, router) || this;
        _this.actions$ = actions$;
        _this.selectedMarker = null;
        _this.MarkerType = marker_1.MarkerType;
        return _this;
        // this.centroidClicks$ = this.store.select(WorkbenchState.getCustomMarkerPageSettings).pipe(
        //   map(settings => settings.centroidClicks)
        // );
        // this.usePlanetCentroiding$ = this.store.select(WorkbenchState.getCustomMarkerPageSettings).pipe(
        //   map(settings => settings.usePlanetCentroiding)
        // );
        // this.markerUpdater = combineLatest(
        //   this.viewerFileIds$,
        //   this.viewerImageFileHeaders$,
        //   this.store.select(CustomMarkersState.getCustomMarkers),
        //   this.store.select(CustomMarkersState.getSelectedCustomMarkers),
        //   this.store.select(ImageFilesState.getEntities),
        // ).pipe(
        //   withLatestFrom(
        //     this.store.select(WorkbenchState.getViewers),
        //     this.store.select(DataFilesState.getEntities),
        //     this.store.select(WorkbenchState.getActiveTool)
        //   )
        // ).subscribe(([[fileIds, imageFiles, customMarkers, selectedCustomMarkers, imageFileStates], viewers, dataFiles, activeTool]) => {
        //   if(activeTool != WorkbenchTool.CUSTOM_MARKER) return;
        //   viewers.forEach((viewer) => {
        //     let fileId = viewer.fileId;
        //     if (fileId == null || !dataFiles[fileId]) {
        //       this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
        //       return;
        //     }
        //     let file = dataFiles[fileId] as ImageFile;
        //     if (!file.headerLoaded) {
        //       this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
        //       return;
        //     }
        //     let markers = customMarkers
        //       .filter(customMarker => customMarker.fileId == file.id)
        //       .map(customMarker => {
        //         let marker: Marker = {
        //           ...customMarker.marker,
        //           data: { id: customMarker.id },
        //           selected:
        //             activeTool == WorkbenchTool.CUSTOM_MARKER &&
        //             selectedCustomMarkers.includes(customMarker)
        //         };
        //         return marker;
        //       });
        //     this.store.dispatch(new SetViewerMarkers(viewer.viewerId, markers));
        //   })
        // })
        // this.subs.push(
        //   this.workbenchState$.subscribe(state => (this.workbenchState = state))
        // );
        // this.subs.push(
        //   this.activeImageFile$.subscribe(imageFile => {
        //     this.activeImageFile = imageFile;
        //   })
        // );
        // this.subs.push(
        //   this.customMarkers$.subscribe(customMarkers => {
        //     this.customMarkers = customMarkers;
        //   })
        // );
        // this.subs.push(
        //   this.selectedCustomMarkers$.subscribe(customMarkers => {
        //     this.selectedCustomMarkers = customMarkers;
        //     if (this.selectedCustomMarkers[0]) {
        //       this.selectedMarker = this.selectedCustomMarkers[0]
        //         .marker as CircleMarker;
        //     } else {
        //       this.selectedMarker = null;
        //     }
        //   })
        // );
    }
    CustomMarkerPageComponent.prototype.ngOnInit = function () { };
    CustomMarkerPageComponent.prototype.ngOnDestroy = function () {
        // this.store.dispatch(new ClearViewerMarkers());
        // this.subs.forEach(sub => sub.unsubscribe());
        // this.markerUpdater.unsubscribe();
    };
    CustomMarkerPageComponent.prototype.keyEvent = function ($event) {
        // if (
        //   this.selectedCustomMarkers.length != 0
        // ) {
        //   if ($event.keyCode === DELETE) {
        //     this.store.dispatch(
        //       new RemoveCustomMarkers(this.selectedCustomMarkers)
        //     );
        //   }
        //   if ($event.keyCode === ESCAPE) {
        //     this.store.dispatch(
        //       new SetCustomMarkerSelection([])
        //     );
        //   }
        // }
    };
    CustomMarkerPageComponent.prototype.onMarkerChange = function ($event, selectedCustomMarker) {
        // this.store.dispatch(
        //   new UpdateCustomMarker(
        //     selectedCustomMarker.id,
        //     {
        //       marker: {
        //         ...selectedCustomMarker.marker,
        //         ...$event
        //       }
        //     }
        //   )
        // );
    };
    CustomMarkerPageComponent.prototype.onCentroidClicksChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdateCustomMarkerPageSettings({ centroidClicks: $event.checked }));
    };
    CustomMarkerPageComponent.prototype.onPlanetCentroidingChange = function ($event) {
        this.store.dispatch(new workbench_actions_1.UpdateCustomMarkerPageSettings({ usePlanetCentroiding: $event.checked }));
    };
    CustomMarkerPageComponent.prototype.deleteSelectedMarkers = function (markers) {
        // this.store.dispatch(
        //   new RemoveCustomMarkers(markers)
        // );
    };
    __decorate([
        core_1.Input()
    ], CustomMarkerPageComponent.prototype, "customMarkers");
    __decorate([
        core_1.Input()
    ], CustomMarkerPageComponent.prototype, "selectedCustomMarkerIds");
    __decorate([
        core_1.Input()
    ], CustomMarkerPageComponent.prototype, "centroidClicks");
    __decorate([
        core_1.Input()
    ], CustomMarkerPageComponent.prototype, "usePlanetCentroiding");
    __decorate([
        core_1.HostListener("document:keyup", ["$event"])
    ], CustomMarkerPageComponent.prototype, "keyEvent");
    CustomMarkerPageComponent = __decorate([
        core_1.Component({
            selector: "app-custom-marker-page",
            templateUrl: "./custom-marker-page.component.html",
            styleUrls: ["./custom-marker-page.component.css"]
        })
    ], CustomMarkerPageComponent);
    return CustomMarkerPageComponent;
}(workbench_page_base_component_1.WorkbenchPageBaseComponent));
exports.CustomMarkerPageComponent = CustomMarkerPageComponent;
