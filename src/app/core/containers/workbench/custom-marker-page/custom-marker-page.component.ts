import { Component, OnInit, HostListener, Input, HostBinding } from "@angular/core";
import { Observable, Subscription } from "rxjs";
import { filter, map } from "rxjs/operators";
import {
  ViewerGridCanvasMouseEvent,
  ViewerGridMarkerMouseEvent
} from "../workbench-viewer-grid/workbench-viewer-grid.component";
import { ImageFile } from "../../../../data-files/models/data-file";
import { CircleMarker, MarkerType, RectangleMarker } from "../../../models/marker";
import { CustomMarker } from "../../../models/custom-marker";
import { WorkbenchTool, WorkbenchStateModel } from "../../../models/workbench-state";
import { centroidPsf, centroidDisk } from "../../../models/centroider";
import { CentroidSettings } from "../../../models/centroid-settings";
import { DELETE, ESCAPE } from "@angular/cdk/keycodes";
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { CustomMarkersState } from '../../../custom-markers.state';
import { SetActiveTool, SetLastRouterPath, UpdateCentroidSettings } from '../../../workbench.actions';
import { RemoveCustomMarkers, SetCustomMarkerSelection, UpdateCustomMarker, AddCustomMarkers, SelectCustomMarkers, DeselectCustomMarkers } from '../../../custom-markers.actions';

@Component({
  selector: "app-custom-marker-page",
  templateUrl: "./custom-marker-page.component.html",
  styleUrls: ["./custom-marker-page.component.css"]
})
export class CustomMarkerPageComponent implements OnInit {
  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;
  subs: Subscription[] = [];
  workbenchState$: Observable<WorkbenchStateModel>;
  centroidSettings$: Observable<CentroidSettings>;
  workbenchState: WorkbenchStateModel;
  showConfig$: Observable<boolean>;
  activeImageFile$: Observable<ImageFile>;
  activeImageFile: ImageFile;
  customMarkers$: Observable<CustomMarker[]>;
  customMarkers: CustomMarker[];
  nextCutomMarkerId: number;
  selectedCustomMarkers$: Observable<CustomMarker[]>;
  selectedCustomMarkers: Array<CustomMarker> = [];
  selectedMarker: CircleMarker = null;
  MarkerType = MarkerType;

  constructor(private store: Store, router: Router) {
    this.fullScreenPanel$ = this.store.select(WorkbenchState.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(WorkbenchState.getInFullScreenMode);

    this.showConfig$ = store.select(WorkbenchState.getShowConfig);
    this.activeImageFile$ = store.select(WorkbenchState.getActiveImageFile);
    this.customMarkers$ = store.select(CustomMarkersState.getCustomMarkers).pipe(map(entities => Object.values(entities)));
    this.selectedCustomMarkers$ = store.select(CustomMarkersState.getSelectedCustomMarkers).pipe(map(entities => Object.values(entities)));
    this.workbenchState$ = store
      .select(WorkbenchState.getState)
      .pipe(filter(state => state != null));
    this.centroidSettings$ = this.workbenchState$.pipe(
      map(state => state && state.centroidSettings)
    );

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
        if (this.selectedCustomMarkers.length == 1) {
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
    if ($event.hitImage) {
      // if (this.selectedCustomMarkers.length == 0 || $event.mouseEvent.altKey) {
      let x = $event.imageX;
      let y = $event.imageY;
      if (this.workbenchState.centroidSettings.centroidClicks) {
        let result: { x: number; y: number };
        if (this.workbenchState.centroidSettings.useDiskCentroiding) {
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
          label: `M${this.nextCutomMarkerId}`,
          x: x,
          y: y,
          radius: 10,
          labelGap: 8,
          labelTheta: 0
        } as CircleMarker
      };


      // let customMarker: CustomMarker = {
      //   id: null,
      //   fileId: this.activeImageFile.id,
      //   marker: {
      //     type: MarkerType.RECTANGLE,
      //     label: `M${this.nextCutomMarkerId}`,
      //     x: x-5,
      //     y: y-5,
      //     width: 10,
      //     height: 10,
      //     labelGap: 8,
      //     labelTheta: 0
      //   } as RectangleMarker
      // };
      this.store.dispatch(
        new AddCustomMarkers([customMarker])
      );
      // } else {
      //   this.store.dispatch(
      //     new customMarkerActions.SetCustomMarkerSelection({
      //       customMarkers: []
      //     })
      //   );
      // }
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
      new UpdateCentroidSettings({ centroidClicks: $event.checked })
    );
  }

  onPlanetCentroidingChange($event) {
    this.store.dispatch(
      new UpdateCentroidSettings({ useDiskCentroiding: $event.checked })
    );
  }
}
