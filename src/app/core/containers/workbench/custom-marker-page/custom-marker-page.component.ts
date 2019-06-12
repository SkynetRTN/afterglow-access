import { Component, OnInit, HostListener, Input, HostBinding } from "@angular/core";
import { Store } from "@ngrx/store";
import { Observable, Subscription } from "rxjs";
import { filter, map } from "rxjs/operators";

import * as fromRoot from "../../../../reducers";
import * as fromCore from "../../../reducers";

import * as workbenchActions from "../../../actions/workbench";
import * as customMarkerActions from "../../../actions/custom-marker";
import {
  ViewerGridCanvasMouseEvent,
  ViewerGridMarkerMouseEvent
} from "../workbench-viewer-grid/workbench-viewer-grid.component";
import { ImageFile } from "../../../../data-files/models/data-file";
import { CircleMarker, MarkerType } from "../../../models/marker";
import { CustomMarker } from "../../../models/custom-marker";
import { WorkbenchTool, WorkbenchState } from "../../../models/workbench-state";
import { centroidPsf, centroidDisk } from "../../../models/centroider";
import { CentroidSettings } from "../../../models/centroid-settings";
import { DELETE, ESCAPE } from "@angular/cdk/keycodes";

@Component({
  selector: "app-custom-marker-page",
  templateUrl: "./custom-marker-page.component.html",
  styleUrls: ["./custom-marker-page.component.css"]
})
export class CustomMarkerPageComponent implements OnInit {
  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
  subs: Subscription[] = [];
  workbenchState$: Observable<WorkbenchState>;
  centroidSettings$: Observable<CentroidSettings>;
  workbenchState: WorkbenchState;
  showConfig$: Observable<boolean>;
  activeImageFile$: Observable<ImageFile>;
  activeImageFile: ImageFile;
  customMarkers$: Observable<CustomMarker[]>;
  customMarkers: CustomMarker[];
  nextCustomMarkerId$: Observable<number>;
  nextCutomMarkerId: number;
  selectedCustomMarkers$: Observable<CustomMarker[]>;
  selectedCustomMarkers: Array<CustomMarker> = [];
  selectedMarker: CircleMarker = null;

  constructor(private store: Store<fromRoot.State>) {
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);
    this.activeImageFile$ = store.select(fromCore.workbench.getActiveFile);
    this.customMarkers$ = store.select(fromCore.getAllCustomMarkers);
    this.nextCustomMarkerId$ = store.select(fromCore.getNextCustomMarkerId);
    this.selectedCustomMarkers$ = store.select(
      fromCore.getSelectedCustomMarkers
    );
    this.workbenchState$ = store
      .select(fromCore.getWorkbenchState)
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
      this.nextCustomMarkerId$.subscribe(id => {
        this.nextCutomMarkerId = id;
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
      new workbenchActions.SetActiveTool({ tool: WorkbenchTool.CUSTOM_MARKER })
    );
  }

  ngOnInit() {}

  @HostListener("document:keyup", ["$event"])
  keyEvent($event: KeyboardEvent) {
    if (
      this.selectedCustomMarkers.length != 0 &&
      $event.srcElement.tagName != "INPUT" &&
      $event.srcElement.tagName != "TEXTAREA"
    ) {
      if ($event.keyCode === DELETE) {
        this.store.dispatch(
          new customMarkerActions.RemoveCustomMarkers({
            markers: this.selectedCustomMarkers
          })
        );
      }
      if ($event.keyCode === ESCAPE) {
        this.store.dispatch(
          new customMarkerActions.SetCustomMarkerSelection({
            customMarkers: []
          })
        );
      }
    }
  }

  onMarkerChange($event, selectedCustomMarker: CustomMarker) {
    this.store.dispatch(
      new customMarkerActions.UpdateCustomMarker({
        markerId: selectedCustomMarker.id,
        changes: {
          marker: {
            ...selectedCustomMarker.marker,
            ...$event
          }
        }
      })
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
      this.store.dispatch(
        new customMarkerActions.AddCustomMarkers({ markers: [customMarker] })
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
      new customMarkerActions.SelectCustomMarkers({
        customMarkers: customMarkers
      })
    );
  }

  deselectCustomMarkers(customMarkers: CustomMarker[]) {
    this.store.dispatch(
      new customMarkerActions.DeselectCustomMarkers({
        customMarkers: customMarkers
      })
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
        new customMarkerActions.SetCustomMarkerSelection({
          customMarkers: [customMarker]
        })
      );
    }
    $event.mouseEvent.stopImmediatePropagation();
    $event.mouseEvent.preventDefault();
  }

  onCentroidClicksChange($event) {
    this.store.dispatch(
      new workbenchActions.UpdateCentroidSettings({
        changes: { centroidClicks: $event.checked }
      })
    );
  }

  onPlanetCentroidingChange($event) {
    this.store.dispatch(
      new workbenchActions.UpdateCentroidSettings({
        changes: { useDiskCentroiding: $event.checked }
      })
    );
  }
}
