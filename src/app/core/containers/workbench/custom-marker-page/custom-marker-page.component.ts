import { Component, OnInit, HostListener, Input, HostBinding, OnDestroy } from "@angular/core";
import { Observable, Subscription, combineLatest } from "rxjs";
import { filter, map, withLatestFrom, tap } from "rxjs/operators";
import {
  ViewerGridCanvasMouseEvent,
  ViewerGridMarkerMouseEvent
} from "../workbench-viewer-grid/workbench-viewer-grid.component";
import { ImageFile } from "../../../../data-files/models/data-file";
import { CircleMarker, MarkerType, RectangleMarker, Marker } from "../../../models/marker";
import { CustomMarker } from "../../../models/custom-marker";
import { WorkbenchTool, WorkbenchStateModel } from "../../../models/workbench-state";
import { centroidPsf, centroidDisk } from "../../../models/centroider";
import { CentroidSettings } from "../../../models/centroid-settings";
import { DELETE, ESCAPE } from "@angular/cdk/keycodes";
import { Router } from '@angular/router';
import { Store, ofActionSuccessful, Actions } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { SetActiveTool, UpdateCentroidSettings, UpdateCustomMarkerPageSettings, SetViewerFile, SetViewerMarkers, ClearViewerMarkers } from '../../../workbench.actions';
import { WorkbenchPageBaseComponent } from '../workbench-page-base/workbench-page-base.component';
import { LoadDataFileHdr } from '../../../../data-files/data-files.actions';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { WorkbenchFileStates } from '../../../workbench-file-states.state';
import { UpdateCustomMarker } from '../../../workbench-file-states.actions';

@Component({
  selector: "app-custom-marker-page",
  templateUrl: "./custom-marker-page.component.html",
  styleUrls: ["./custom-marker-page.component.css"]
})
export class CustomMarkerPageComponent extends WorkbenchPageBaseComponent implements OnInit, OnDestroy {
  @Input() customMarkers: CustomMarker[];
  @Input() selectedCustomMarkerIds: string[];
  @Input() centroidClicks: Boolean;
  @Input() usePlanetCentroiding: Boolean;

  selectedMarker: CircleMarker = null;
  MarkerType = MarkerType;

  constructor(private actions$: Actions, store: Store, router: Router, ) {
    super(store, router);
    

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

  ngOnInit() { }

  ngOnDestroy() {
    // this.store.dispatch(new ClearViewerMarkers());

    // this.subs.forEach(sub => sub.unsubscribe());
    // this.markerUpdater.unsubscribe();
  }

  @HostListener("document:keyup", ["$event"])
  keyEvent($event: KeyboardEvent) {
   
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
  }

  onMarkerChange($event, selectedCustomMarker: CustomMarker) {
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
  }

  

  onCentroidClicksChange($event) {
    this.store.dispatch(
      new UpdateCustomMarkerPageSettings({ centroidClicks: $event.checked })
    );
  }

  onPlanetCentroidingChange($event) {
    this.store.dispatch(
      new UpdateCustomMarkerPageSettings({ usePlanetCentroiding: $event.checked })
    );
  }

  deleteSelectedMarkers(markers: CustomMarker[]) {
    // this.store.dispatch(
    //   new RemoveCustomMarkers(markers)
    // );
  }
}
