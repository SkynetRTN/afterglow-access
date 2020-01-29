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
import { CustomMarkersState } from '../../../custom-markers.state';
import { SetActiveTool, SetLastRouterPath, UpdateCentroidSettings, UpdateCustomMarkerPageSettings, SetViewerFile, SetViewerMarkers, ClearViewerMarkers } from '../../../workbench.actions';
import { RemoveCustomMarkers, SetCustomMarkerSelection, UpdateCustomMarker, AddCustomMarkers, SelectCustomMarkers, DeselectCustomMarkers } from '../../../custom-markers.actions';
import { WorkbenchPageBaseComponent } from '../workbench-page-base/workbench-page-base.component';
import { LoadDataFileHdr } from '../../../../data-files/data-files.actions';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { ImageFilesState } from '../../../image-files.state';

@Component({
  selector: "app-custom-marker-page",
  templateUrl: "./custom-marker-page.component.html",
  styleUrls: ["./custom-marker-page.component.css"]
})
export class CustomMarkerPageComponent extends WorkbenchPageBaseComponent implements OnInit, OnDestroy {
  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
  subs: Subscription[] = [];
  markerUpdater: Subscription;
  workbenchState$: Observable<WorkbenchStateModel>;
  centroidClicks$: Observable<boolean>;
  usePlanetCentroiding$: Observable<boolean>;
  workbenchState: WorkbenchStateModel;
  activeImageFile: ImageFile;
  customMarkers$: Observable<CustomMarker[]>;
  customMarkers: CustomMarker[];
  nextCustomMarkerId: number = 0;
  selectedCustomMarkers$: Observable<CustomMarker[]>;
  selectedCustomMarkers: Array<CustomMarker> = [];
  selectedMarker: CircleMarker = null;
  MarkerType = MarkerType;

  constructor(private actions$: Actions, store: Store, router: Router, ) {
    super(store, router);
    this.customMarkers$ = store.select(CustomMarkersState.getCustomMarkers).pipe(map(entities => Object.values(entities)));
    this.selectedCustomMarkers$ = store.select(CustomMarkersState.getSelectedCustomMarkers).pipe(map(entities => Object.values(entities)));
    this.workbenchState$ = store
      .select(WorkbenchState.getState)
      .pipe(filter(state => state != null));

    this.centroidClicks$ = this.store.select(WorkbenchState.getCustomMarkerPageSettings).pipe(
      map(settings => settings.centroidClicks)
    );

    this.usePlanetCentroiding$ = this.store.select(WorkbenchState.getCustomMarkerPageSettings).pipe(
      map(settings => settings.usePlanetCentroiding)
    );

    this.markerUpdater = combineLatest(
      this.viewerFileIds$,
      this.viewerImageFileHeaders$,
      this.store.select(CustomMarkersState.getCustomMarkers),
      this.store.select(CustomMarkersState.getSelectedCustomMarkers),
      this.store.select(ImageFilesState.getEntities),
    ).pipe(
      withLatestFrom(
        this.store.select(WorkbenchState.getViewers),
        this.store.select(DataFilesState.getEntities),
        this.store.select(WorkbenchState.getActiveTool)
      )
    ).subscribe(([[fileIds, imageFiles, customMarkers, selectedCustomMarkers, imageFileStates], viewers, dataFiles, activeTool]) => {
      viewers.forEach((viewer) => {
        let fileId = viewer.fileId;
        if (fileId == null || !dataFiles[fileId]) {
          this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
          return;
        }
        let file = dataFiles[fileId] as ImageFile;
        if (!file.headerLoaded) {
          this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
          return;
        }

        let markers = customMarkers
          .filter(customMarker => customMarker.fileId == file.id)
          .map(customMarker => {
            let marker: Marker = {
              ...customMarker.marker,
              data: { id: customMarker.id },
              selected:
                activeTool == WorkbenchTool.CUSTOM_MARKER &&
                selectedCustomMarkers.includes(customMarker)
            };
            return marker;
          });

        this.store.dispatch(new SetViewerMarkers(viewer.viewerId, markers));
      })
    })




    this.subs.push(
      this.workbenchState$.subscribe(state => (this.workbenchState = state))
    );

    this.subs.push(
      this.activeImageFile$.subscribe(imageFile => {
        this.activeImageFile = imageFile;
      })
    );

    this.subs.push(
      this.customMarkers$.subscribe(customMarkers => {
        this.customMarkers = customMarkers;
      })
    );

    this.subs.push(
      this.selectedCustomMarkers$.subscribe(customMarkers => {
        this.selectedCustomMarkers = customMarkers;
        if (this.selectedCustomMarkers[0]) {
          this.selectedMarker = this.selectedCustomMarkers[0]
            .marker as CircleMarker;
        } else {
          this.selectedMarker = null;
        }
      })
    );

    this.store.dispatch(
      new SetActiveTool(WorkbenchTool.CUSTOM_MARKER)
    );

    this.store.dispatch(
      new SetLastRouterPath(router.url)
    )
  }

  ngOnInit() { }

  ngOnDestroy() {
    this.store.dispatch(new ClearViewerMarkers());

    this.subs.forEach(sub => sub.unsubscribe());
    this.markerUpdater.unsubscribe();
  }

  @HostListener("document:keyup", ["$event"])
  keyEvent($event: KeyboardEvent) {
    // if (
    //   this.selectedCustomMarkers.length != 0 &&
    //   $event.srcElement.tagName != "INPUT" &&
    //   $event.srcElement.tagName != "TEXTAREA"
    // ) {
    if (
      this.selectedCustomMarkers.length != 0
    ) {
      if ($event.keyCode === DELETE) {
        this.store.dispatch(
          new RemoveCustomMarkers(this.selectedCustomMarkers)
        );
      }
      if ($event.keyCode === ESCAPE) {
        this.store.dispatch(
          new SetCustomMarkerSelection([])
        );
      }
    }
  }

  onMarkerChange($event, selectedCustomMarker: CustomMarker) {
    this.store.dispatch(
      new UpdateCustomMarker(
        selectedCustomMarker.id,
        {
          marker: {
            ...selectedCustomMarker.marker,
            ...$event
          }
        }
      )
    );
  }

  onImageClick($event: ViewerGridCanvasMouseEvent) {
    let settings = this.store.selectSnapshot(WorkbenchState.getCustomMarkerPageSettings);
    if ($event.hitImage) {
      if (this.selectedCustomMarkers.length == 0 || $event.mouseEvent.altKey) {
        let x = $event.imageX;
        let y = $event.imageY;
        if (settings.centroidClicks) {
          let result: { x: number; y: number };
          if (settings.usePlanetCentroiding) {
            result = centroidDisk(
              this.activeImageFile,
              x,
              y,
              this.workbenchState.centroidSettings.diskCentroiderSettings
            );
          } else {
            result = centroidPsf(
              this.activeImageFile,
              x,
              y,
              this.workbenchState.centroidSettings.psfCentroiderSettings
            );
          }
          x = result.x;
          y = result.y;
        }

        let customMarker: CustomMarker = {
          id: null,
          fileId: this.activeImageFile.id,
          marker: {
            type: MarkerType.CIRCLE,
            label: null,
            x: x,
            y: y,
            radius: 10,
            labelGap: 8,
            labelTheta: 0
          } as CircleMarker
        };

        this.store.dispatch(
          new AddCustomMarkers([customMarker])
        );
      } else {
        this.store.dispatch(
          new SetCustomMarkerSelection([])
        );
      }
    }
  }

  selectCustomMarkers(customMarkers: CustomMarker[]) {
    this.store.dispatch(
      new SelectCustomMarkers(customMarkers)
    );
  }

  deselectCustomMarkers(customMarkers: CustomMarker[]) {
    this.store.dispatch(
      new DeselectCustomMarkers(customMarkers)
    );
  }

  onMarkerClick($event: ViewerGridMarkerMouseEvent) {
    if ($event.mouseEvent.altKey) return;

    let customMarker = this.customMarkers.find(
      customMarker =>
        $event.marker.data && customMarker.id == $event.marker.data["id"]
    );

    if (!customMarker) return;

    let customMarkerSelected = this.selectedCustomMarkers.includes(
      customMarker
    );

    if ($event.mouseEvent.ctrlKey) {
      if (!customMarkerSelected) {
        // select the source
        this.selectCustomMarkers([customMarker]);
      } else {
        // deselect the source
        this.deselectCustomMarkers([customMarker]);
      }
    } else {
      this.store.dispatch(
        new SetCustomMarkerSelection([customMarker])
      );
    }
    $event.mouseEvent.stopImmediatePropagation();
    $event.mouseEvent.preventDefault();
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
    this.store.dispatch(
      new RemoveCustomMarkers(markers)
    );
  }
}
